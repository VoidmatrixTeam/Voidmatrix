class GithubHandler {
    static async getFiles(user, repository, directory = "", branch = "main") {
        const url = `https://api.github.com/repos/${user}/${repository}/contents/${directory}?ref=${branch}`;
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

class ScriptRequestHandler extends GithubHandler {
    static async getScripts(branch = "feature/version-overhaul") {
        const files = await GithubHandler.getFiles('VoidmatrixTeam', 'Voidmatrix', 'temp/market', branch);
        if (!files || files.message === "Not Found") {
            console.error('Error fetching files:', files);
            return [];
        }
        const downloadUrls = files.map(file => file.download_url);
        try {
            return await Promise.all(downloadUrls.map(url => fetch(url).then(res => res.json())));
        } catch (error) {
            console.error('Error fetching file data:', error);
        }
    }
}