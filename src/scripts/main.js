document.addEventListener("DOMContentLoaded", async function () {
    const wrapper = document.querySelector('.right-panel-content');
    const dotArtistWrapper = new DotArtistWrapper();
    wrapper.appendChild(dotArtistWrapper);

    const body = document.querySelector('body');
    const commandDataList = new CommandDataList();
    body.appendChild(commandDataList);
    const leftPanelWrapper = document.querySelector('.left-panel-content');
    const script = new ScriptGroupManager();
    leftPanelWrapper.appendChild(script);

    const searchWrapper = document.querySelector('.search-wrapper');
    const searchArea = new SearchArea(await ScriptRequestHandler.getScripts());
    searchWrapper.appendChild(searchArea);
});
