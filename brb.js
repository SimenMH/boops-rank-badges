let userRanks = {};

const tiers = {
  URL: 'ranked-emblems/Emblem_',
  UNRANKED: 'Unranked',
  IRON: 'Iron',
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  MASTER: 'Master',
  GRANDMASTER: 'Grandmaster',
  CHALLENGER: 'Challenger',
};

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if ((request.message = 'fetchRanks')) {
    fetchRanks();
    sendResponse({ message: 'success' });
  }
  return true;
});

function fetchRanks() {
  chrome.runtime.sendMessage({ message: 'getTwitchToken' }, response => {
    if (response.status === 'success' && response.message) {
      fetch('http://localhost:5000/', {
        method: 'GET',
        headers: {
          'twitch-token': response.message,
        },
      })
        .then(res => res.json())
        .then(res => {
          if (res) {
            userRanks = res;
            initObservers();
          }
        });
    }
  });
}
fetchRanks();

let config = { attributes: false, childList: true, characterData: false };
const chatLoadedObserver = new MutationObserver((mutations, observer) => {
  if (!chrome.runtime?.id) {
    chatLoadedObserver.disconnect();
    return;
  }
  mutations.forEach(() => {
    const chatSelector = document.getElementsByClassName(
      'chat-scrollable-area__message-container'
    );
    if (chatSelector.length > 0) {
      const target = chatSelector[0];
      newMessage.observe(target, config);
      observer.disconnect();
    }
  });
});

const newMessage = new MutationObserver(mutations => {
  if (!chrome.runtime?.id) {
    newMessage.disconnect();
    return;
  }
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(function (addedNode) {
      // If not a chat message, return
      if (!addedNode.classList.contains('chat-line__message')) {
        return;
      }

      const username = addedNode
        .getElementsByClassName('chat-author__display-name')[0]
        .innerHTML.toLowerCase();

      // if userRank[username]
      if (Math.random() >= 0.75) {
        const ffzBadgeContainer = addedNode.getElementsByClassName(
          'chat-line__message--badges'
        )[0];
        const ttvBadgeContainer = addedNode.getElementsByClassName(
          'chat-line__username-container'
        )[0];

        const badge = document.createElement('span');
        badge.classList.add('league-rank');

        const user = randomRank(); // userRanks[username]
        const iconUrl = chrome.runtime.getURL(
          `${tiers.URL}${tiers[user.tier]}.png`
        );

        badge.style.backgroundImage = `url(${iconUrl})`;

        const tooltip = document.createElement('span');
        tooltip.classList.add('tooltiptext');
        tooltip.innerHTML = `${tiers[user.tier]} ${user.rank}`;
        badge.appendChild(tooltip);

        if (ttvBadgeContainer) {
          ttvBadgeContainer.firstChild.appendChild(badge);
        }
        if (ffzBadgeContainer) {
          ffzBadgeContainer.appendChild(badge);
        }

        // Set margin after adding badge to center tooltip
        tooltip.style.marginLeft = `-${tooltip.clientWidth / 2}px`;
      }
    });
  });
});

let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initObservers();
  }
});

function initObservers() {
  // Add mutation that checks the game category
  // Only run observers when in the correct category if setting is enabled
  disconnectObservers();
  let htmlBody = document.body;
  chatLoadedObserver.observe(htmlBody, config);
  urlObserver.observe(document, { subtree: true, childList: true });
}

function disconnectObservers() {
  chatLoadedObserver.disconnect();
  newMessage.disconnect();
  urlObserver.disconnect();
}

function randomRank() {
  const allTiers = [
    'UNRANKED',
    'IRON',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'CHALLENGER',
  ];
  const divisions = ['IV', 'III', 'II', 'I'];
  return {
    tier: allTiers[Math.floor(Math.random() * allTiers.length)],
    rank: divisions[Math.floor(Math.random() * divisions.length)],
  };
}

console.log('Extension: Initiated content script');
