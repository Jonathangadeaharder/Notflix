<script lang="ts">
    let activeTab = 'transcribe'; // transcribe, filter, translate, pipeline
    let isLoading = false;
    let progress = 0; 
    let statusMessage = '';

    const PROGRESS_INITIAL = 0;
    const PROGRESS_MID = 50;
    const PROGRESS_COMPLETE = 100;

    // Transcribe
    let transcribeFile: FileList;
    let transcribeLang = 'es';
    let videoPreviewUrl: string | null = null;

    // Filter
    let filterFile: FileList;
    let filterLang = 'es';

    // Translate
    let translateFile: FileList;
    let sourceLang = 'de';
    let targetLang = 'es';

    // Pipeline
    let pipelineFile: FileList;
    let pipelineSourceLang = 'es';
    let pipelineTargetLang = 'en';
    let pipelineVideoPreviewUrl: string | null = null;

    $: if (transcribeFile && transcribeFile[0]) {
        if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
        videoPreviewUrl = URL.createObjectURL(transcribeFile[0]);
    }

    $: if (pipelineFile && pipelineFile[0]) {
        if (pipelineVideoPreviewUrl) URL.revokeObjectURL(pipelineVideoPreviewUrl);
        pipelineVideoPreviewUrl = URL.createObjectURL(pipelineFile[0]);
    }

    async function handleTranscribe() {
        if (!transcribeFile || transcribeFile.length === 0) return;
        
        await runProcess('/api/debug/transcribe', {
            file: transcribeFile[0],
            language: transcribeLang
        }, 'transcription.srt');
    }

    async function handleFilter() {
        if (!filterFile || filterFile.length === 0) return;

        await runProcess('/api/debug/filter', {
            file: filterFile[0],
            language: filterLang
        }, 'analysis.srt');
    }

    async function handleTranslate() {
        if (!translateFile || translateFile.length === 0) return;

        await runProcess('/api/debug/translate', {
            file: translateFile[0],
            sourceLang,
            targetLang
        }, 'translation.srt');
    }

    async function handlePipeline() {
        if (!pipelineFile || !pipelineFile[0]) {
            statusMessage = "Please select a file first.";
            return;
        }

        isLoading = true;
        progress = PROGRESS_INITIAL;
        
        try {
            statusMessage = 'Step 1/3: Transcribing Video...';
            const transcriptionBlob = await runProcess('/api/debug/transcribe', {
                file: pipelineFile[0],
                language: pipelineSourceLang
            }, null, false);
            
            statusMessage = 'Step 2/3: Analyzing (Filtering)...';
            progress = PROGRESS_MID; 
            const srtFile = new File([transcriptionBlob], "temp.srt", { type: "text/plain" });
            
            const analysisBlob = await runProcess('/api/debug/filter', {
                file: srtFile,
                language: pipelineSourceLang
            }, null, false);

            statusMessage = 'Step 3/3: Translating...';
            const analysisFile = new File([analysisBlob], "temp_analyzed.srt", { type: "text/plain" });

            await runProcess('/api/debug/translate', {
                file: analysisFile,
                sourceLang: pipelineSourceLang,
                targetLang: pipelineTargetLang
            }, 'pipeline_complete.srt', true);

            progress = PROGRESS_COMPLETE;
            statusMessage = 'Pipeline Completed Successfully!';

        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Pipeline Error:", message);
            statusMessage = `Pipeline Error: ${message}`;
        } finally {
            isLoading = false;
        }
    }

    type FormDataValue = string | Blob | File;

    function createFormData(data: Record<string, FormDataValue>): FormData {
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        return formData;
    }

    function updateStatus(message: string, currentProgress: number) {
        statusMessage = message;
        progress = currentProgress;
    }

    async function runProcess(
        url: string, 
        data: Record<string, FormDataValue>, 
        downloadName: string | null = null, 
        autoStopLoading = true
    ): Promise<Blob> {
        if (autoStopLoading) {
            isLoading = true;
            updateStatus('Processing...', PROGRESS_INITIAL);
        }
        
        try {
            const res = await fetch(url, {
                method: 'POST',
                body: createFormData(data)
            });

            if (!res.ok) {
                const errorJson = await res.json();
                throw new Error(errorJson.error || res.statusText);
            }

            const blob = await res.blob();
            if (downloadName) triggerDownload(blob, downloadName);
            
            if (autoStopLoading) {
                updateStatus('Finished!', PROGRESS_COMPLETE);
            }
            return blob;

        } catch (err) {
            if (autoStopLoading) {
                const message = err instanceof Error ? err.message : String(err);
                statusMessage = `Error: ${message}`;
            }
            throw err;
        } finally {
            if (autoStopLoading) isLoading = false;
        }
    }

    function triggerDownload(blob: Blob, filename: string) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
    }
</script>

<div class="container mx-auto p-8">
    <h1 class="text-3xl font-bold mb-6 text-white">Linguistics Debugger</h1>

    <div class="flex mb-4 border-b border-zinc-800">
        <button 
            class="px-4 py-2 mr-2 {activeTab === 'transcribe' ? 'border-b-2 border-red-500 font-bold text-white' : 'text-zinc-400'}"
            on:click={() => activeTab = 'transcribe'}>
            Transcribe
        </button>
        <button 
            class="px-4 py-2 mr-2 {activeTab === 'filter' ? 'border-b-2 border-red-500 font-bold text-white' : 'text-zinc-400'}"
            on:click={() => activeTab = 'filter'}>
            Filter (Analyze)
        </button>
        <button 
            class="px-4 py-2 mr-2 {activeTab === 'translate' ? 'border-b-2 border-red-500 font-bold text-white' : 'text-zinc-400'}"
            on:click={() => activeTab = 'translate'}>
            Translate
        </button>
        <button 
            class="px-4 py-2 {activeTab === 'pipeline' ? 'border-b-2 border-red-500 font-bold text-white' : 'text-zinc-400'}"
            on:click={() => activeTab = 'pipeline'}>
            Full Pipeline
        </button>
    </div>

    <div class="p-6 border border-zinc-800 rounded-xl shadow-md bg-zinc-900">
        {#if activeTab === 'transcribe'}
            <h2 class="text-xl font-semibold mb-4 text-white">Transcribe Video</h2>
            <div class="mb-4">
                <label class="block">
                    <span class="block mb-2 font-medium text-zinc-300">Video File</span>
                    <input type="file" accept="video/*,audio/*" on:change={(e) => transcribeFile = e.currentTarget.files!} class="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"/>
                </label>
            </div>

            {#if videoPreviewUrl}
                <div class="mb-4">
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={videoPreviewUrl} controls class="w-full max-h-96 bg-black rounded border border-zinc-800"></video>
                </div>
            {/if}

            <div class="mb-4">
                <label class="block">
                    <span class="block mb-2 font-medium text-zinc-300">Language (e.g. es, en)</span>
                    <input type="text" bind:value={transcribeLang} class="bg-black/50 border border-zinc-700 text-white p-2 rounded w-full max-w-xs"/>
                </label>
            </div>
            <button on:click={handleTranscribe} disabled={isLoading} class="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                Start Transcription
            </button>

        {:else if activeTab === 'filter'}
            <h2 class="text-xl font-semibold mb-4 text-white">Filter / Analyze SRT</h2>
            <div class="mb-4">
                <label class="block">
                    <span class="block mb-2 font-medium text-zinc-300">SRT File</span>
                    <input type="file" accept=".srt" on:change={(e) => filterFile = e.currentTarget.files!} class="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"/>
                </label>
            </div>
            <div class="mb-4">
                <label class="block">
                    <span class="block mb-2 font-medium text-zinc-300">Language (of SRT)</span>
                    <input type="text" bind:value={filterLang} class="bg-black/50 border border-zinc-700 text-white p-2 rounded w-full max-w-xs"/>
                </label>
            </div>
            <button on:click={handleFilter} disabled={isLoading} class="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                Start Analysis
            </button>

        {:else if activeTab === 'translate'}
            <h2 class="text-xl font-semibold mb-4 text-white">Translate SRT</h2>
            <div class="mb-4">
                <label class="block">
                    <span class="block mb-2 font-medium text-zinc-300">SRT File</span>
                    <input type="file" accept=".srt" on:change={(e) => translateFile = e.currentTarget.files!} class="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"/>
                </label>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4 max-w-md">
                <div>
                    <label class="block">
                        <span class="block mb-2 font-medium text-zinc-300">Source Language</span>
                        <input type="text" bind:value={sourceLang} class="bg-black/50 border border-zinc-700 text-white p-2 rounded w-full"/>
                    </label>
                </div>
                <div>
                    <label class="block">
                        <span class="block mb-2 font-medium text-zinc-300">Target Language</span>
                        <input type="text" bind:value={targetLang} class="bg-black/50 border border-zinc-700 text-white p-2 rounded w-full"/>
                    </label>
                </div>
            </div>
            <button on:click={handleTranslate} disabled={isLoading} class="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                Start Translation
            </button>

        {:else if activeTab === 'pipeline'}
            <h2 class="text-xl font-semibold mb-4 text-white">Full Pipeline (Transcribe -> Analyze -> Translate)</h2>
            <div class="mb-4">
                <label class="block">
                    <span class="block mb-2 font-medium text-zinc-300">Video File</span>
                    <input type="file" accept="video/*,audio/*" on:change={(e) => pipelineFile = e.currentTarget.files!} class="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700"/>
                </label>
            </div>

            {#if pipelineVideoPreviewUrl}
                <div class="mb-4">
                    <!-- svelte-ignore a11y_media_has_caption -->
                    <video src={pipelineVideoPreviewUrl} controls class="w-full max-h-96 bg-black rounded border border-zinc-800"></video>
                </div>
            {/if}

            <div class="grid grid-cols-2 gap-4 mb-4 max-w-md">
                <div>
                    <label class="block">
                        <span class="block mb-2 font-medium text-zinc-300">Source Language (Video)</span>
                        <input type="text" bind:value={pipelineSourceLang} class="bg-black/50 border border-zinc-700 text-white p-2 rounded w-full"/>
                    </label>
                </div>
                <div>
                    <label class="block">
                        <span class="block mb-2 font-medium text-zinc-300">Target Language (Translation)</span>
                        <input type="text" bind:value={pipelineTargetLang} class="bg-black/50 border border-zinc-700 text-white p-2 rounded w-full"/>
                    </label>
                </div>
            </div>
            <button on:click={handlePipeline} disabled={isLoading} class="bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                Run Full Pipeline
            </button>
        {/if}

        {#if isLoading || progress > 0}
            <div class="mt-6">
                <div class="flex justify-between mb-1">
                    <span class="text-base font-medium text-red-500">{statusMessage}</span>
                    <span class="text-sm font-medium text-red-500">{progress}%</span>
                </div>
                <div class="w-full bg-zinc-800 rounded-full h-2.5">
                    <div class="bg-red-600 h-2.5 rounded-full transition-all duration-500" style="width: {progress}%"></div>
                </div>
            </div>
        {/if}
    </div>
</div>
