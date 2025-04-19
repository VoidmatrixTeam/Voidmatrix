document.addEventListener("DOMContentLoaded", async function () {
    const wrapper = document.querySelector('.right-panel-content');
    const dotArtistWrapper = new DotArtistWrapper();
    wrapper.appendChild(dotArtistWrapper);

    const body = document.querySelector('body');
    let datalists = [
        new CommandDataList(),
        new SpeciesDataList(),
        new ItemDataList(),
        new MoveDataList(),
        new MapDataList()
    ];
    body.append(...datalists);

    const leftPanelWrapper = document.querySelector('.left-panel-content');
    const scriptGroupManager = new ScriptGroupManager();
    leftPanelWrapper.appendChild(scriptGroupManager);

    const searchWrapper = document.querySelector('.search-wrapper');
    const searchArea = new SearchArea(await ScriptRequestHandler.getScripts());
    searchWrapper.appendChild(searchArea);
});
