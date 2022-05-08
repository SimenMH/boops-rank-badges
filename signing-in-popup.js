chrome.runtime.onMessage.addListener(request => {
  if (request.message === 'closePopup') {
    window.close();
    return true;
  }
});
