$(document).ready(async () => {
    const languageUser = "en-US";
    $('#token').val(JSON.parse(localStorage.getItem('G_api_token'))) || "";
    $('#preSet').val(JSON.parse(localStorage.getItem('preSettings'))) || "";

    // Create stop button element
    const stopTTSButton = $('#stopTTSButton');
    $("#settingsButton").hide();
    
    $('#saveToken').on('click', () => {
        const newToken = $('#token').val();
        localStorage.setItem('G_api_token', JSON.stringify(newToken));

        const preSet = $('#preSet').val();
        localStorage.setItem('preSettings', JSON.stringify(preSet));

        $('#settings').hide('slow');
        $("#settingsButton").show('slow');
    });

    $("#settingsButton").on('click', () => {
        $('#settings').show('slow');
    });

    $('#clearApiToken').on('click', () => {
        localStorage.removeItem('G_api_token');
        $('#token').val('');
    });

    $('#clearSet').on('click', () => {
        localStorage.removeItem('preSettings');
        $('#preSet').val('');
    });

    let utterance = null;

    function speakText(text) {
        if ('speechSynthesis' in window) {
            // Create a new utterance
            utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageUser;
            window.speechSynthesis.speak(utterance);
            stopTTSButton.prop('disabled', false); // Enable stop button when speech starts
        }
    }

    // Stop speaking when the stop button is clicked
    stopTTSButton.click(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any ongoing speech
            stopTTSButton.prop('disabled', true); // Disable stop button after speech stops
        }
    });

    const conversation = [];

    function appendMessage(role, text) {
        const roleClass = (role === 'user') ? 'userMessage' : 'assistantMessage';
        const msgHTML = `<div class="${roleClass}">${text}</div>`;
        $('#chatBox').append(msgHTML);
        $('#chatBox').scrollTop($('#chatBox')[0].scrollHeight);
        console.log(`[appendMessage] ${role}:`, text);
    }

    console.log('[ready] Chat initialized');
    const predata = JSON.parse(localStorage.getItem('preSettings')) || '';

    $('#sendRequest').click(async () => {
        const userInput = predata + $('#request').val().trim();
        console.log('[click] User input:', userInput);

        if (!userInput) {
            console.warn('[click] Empty input — request canceled');
            return;
        }

        $('#request').val('');
        
        const token = JSON.parse(localStorage.getItem('G_api_token')); // Make sure this is valid
        if (!token) {
            appendMessage('assistant', 'Error: Missing Gemini API token.');
            return;
        }

        const maxTokens = $('#maxTokens').val(); // Get selected max tokens
        const model = $('#model').val(); // Get selected model

        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${token}`;

        const requestBody = {
            contents: [
                {
                    parts: [{ text: userInput }]
                }
            ],
            maxOutputTokens: maxTokens // Add max tokens parameter
        };

        console.log('[click] Sending POST to:', apiEndpoint);
        console.log('[click] Payload:', requestBody);

        try {
            const res = await $.ajax({
                url: apiEndpoint,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(requestBody)
            });

            console.log('[response] Raw:', res);

            let output = res?.candidates?.[0]?.content?.parts?.[0]?.text || 'No valid response received';
            console.log('[response] Extracted text:', output);
            speakText(output);

            // Process the response to remove unwanted formatting and beautify it
            output = cleanResponse(output);

            conversation.push({ role: 'assistant', text: output });
            appendMessage('assistant', output);
            speakText(output);
            
        } catch (err) {
            const errorText = err.responseText || err.statusText || err.message || 'Unknown error';
            console.error('[error] Gemini API call failed:', errorText);
            appendMessage('assistant', 'Error: ' + errorText);
        }
    });

    // Function to clean and format the response
    function cleanResponse(response) {
        response = response.replace(/\*\*|\*|\*\*|<\/?[^>]+(>|$)/g, '')  // Remove all markdown and HTML tags
                            .replace(/Ingredients:/i, '<h3>Ingredients</h3><ul>')
                            .replace(/(?:\s*\*\s*(.+?)\s*\*)/g, '<li>$1</li>')
                            .replace(/<\/ul>/, '</ul>')
                            .replace(/Instructions:/i, '<h3>Instructions</h3><ol>') 
                            .replace(/(?:\d+\.\s*(.+?))(\s*(?=\d+\.|$))/g, '<li>$1</li>')
                            .replace(/<\/ol>/, '</ol>');
        response = response.replace(/\n\s*\n/g, '\n').trim();
        return response;
    }
});
