let twitchToken = null;
let riotToken = null;
let user = null;

async function onStartup() {
  updateTwitchTokenFromCookies();
}
chrome.runtime.onStartup.addListener(onStartup);
chrome.runtime.onInstalled.addListener(onStartup);

chrome.cookies.onChanged.addListener(changeInfo => {
  const cookie = changeInfo.cookie;
  if (cookie.domain === '.twitch.tv' && cookie.name === 'auth-token') {
    updateTwitchTokenFromCookies();
  }
});

function updateTwitchTokenFromCookies() {
  chrome.cookies
    .get({ url: 'https://twitch.tv/', name: 'auth-token' })
    .then(res => {
      if (res && res.value) {
        twitchToken = res.value;
      } else {
        twitchToken = null;
      }
      validateTwitchToken();
    });
}

async function validateTwitchToken() {
  if (twitchToken) {
    const res = await fetch('http://localhost:5000/validate', {
      method: 'GET',
      headers: {
        'twitch-token': twitchToken,
      },
    });
    if (res.ok) {
      user = res.json();
      chrome.action.setPopup({ popup: './signed-in-popup.html' });
    } else {
      chrome.action.setPopup({ popup: './prompt-sign-in-popup.html' });
    }
  } else {
    chrome.action.setPopup({ popup: './popup.html' });
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.message === 'getTwitchToken') {
    if (twitchToken) {
      sendResponse({ status: 'success', message: twitchToken });
    } else {
      sendResponse({ status: 'failed', message: null });
    }
  }
  return true;
});

chrome.runtime.onMessage.addListener(request => {
  if (request.message === 'loginWithRiot') {
    chrome.action.setPopup({ popup: './signing-in-popup.html' });
    chrome.tabs.create(
      { active: true, url: 'https://account.riotgames.com' },
      riotTab => {
        let processFinished = false;
        function onTabUpdate(tabId, _changeInfo, updatedTab) {
          if (tabId === riotTab.id) {
            const validURL = [
              '.riotgames.com/',
              '.lolesports.com/',
              '.playvalorant.com/',
              '.leagueoflegends.com/',
            ].some(url => updatedTab.url.includes(url));

            if (validURL) {
              if (
                updatedTab.status === 'complete' &&
                updatedTab.url === 'https://account.riotgames.com/'
              ) {
                chrome.cookies.get(
                  { url: 'https://account.riotgames.com', name: 'id_token' },
                  res => {
                    processFinished = true;
                    if (res.value) {
                      riotToken = res.value;
                      linkAccounts();
                    }
                    chrome.tabs.remove(riotTab.id);
                  }
                );
              }
            } else {
              chrome.tabs.onUpdated.removeListener(onTabUpdate);
            }
          }
        }
        chrome.tabs.onUpdated.addListener(onTabUpdate);

        chrome.tabs.onRemoved.addListener(tabId => {
          if (tabId === riotTab.id) {
            chrome.tabs.onUpdated.removeListener(onTabUpdate);
            if (!processFinished) {
              // Create popup for failed linking, try again
              chrome.action.setPopup({
                popup: 'prompt-sign-in-popup.html',
              });
            }
          }
        });
      }
    );
  }
  return true;
});

function linkAccounts() {
  if (twitchToken && riotToken) {
    createUser().then(res => {
      if (res.ok) {
        chrome.runtime.sendMessage({ message: 'closePopup' });
        chrome.action.setPopup({
          popup: 'signed-in-popup.html',
        });
        chrome.tabs.query({ url: 'https://*.twitch.tv/*' }, tabs => {
          if (tabs) {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { message: 'fetchRanks' });
            });
          }
        });
      } else {
        // set popup to linking failed, try again
      }
    });
  }
}

function createUser() {
  return fetch('http://localhost:5000/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ twitchToken, riotToken }),
  }).then(res => res);
}
