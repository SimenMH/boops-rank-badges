document
  .querySelector('#link-riot-account')
  .addEventListener('submit', async function (event) {
    event.preventDefault();
    await chrome.runtime.sendMessage({ message: 'loginWithRiot' });
  });
