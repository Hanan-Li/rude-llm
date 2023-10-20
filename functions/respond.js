const { OpenAI } = require("openai");

// Define the main function for handling requests
exports.handler = async function(context, event, callback) {
    // Set up the OpenAI API with the API key
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const twiml = new Twilio.twiml.VoiceResponse();

    // Parse the cookie value if it exists
    const caller = event["Caller"]
    const cookieValue = event.request.cookies[caller];
    const cookieData = cookieValue ?
        JSON.parse(decodeURIComponent(cookieValue)) :
        null;

    // Create a conversation variable to store the dialog and the user's input to the conversation history
    let voiceInput = event.SpeechResult;
    const conversation = cookieData?.conversation || [];
    conversation.push(`user: ${voiceInput}`);

    const llm_response = await getLLMResponse(openai, conversation);
    conversation.push(`assistant: ${llm_response}`);

    // Actually executing what to say and redirecting back to answer
    twiml.say({
            voice: "Google.en-AU-Standard-A",
        },
        llm_response
    );
    twiml.redirect({
            method: "POST",
        },
        `/answer`
    );

    // Set Correct response for callback
    const response = new Twilio.Response();
    response.appendHeader("Content-Type", "application/xml");
    response.setBody(twiml.toString());
    // Update the conversation history cookie with the response from the OpenAI API
    const newCookieValue = encodeURIComponent(
        JSON.stringify({
            conversation,
        })
    );
    response.setCookie(caller, newCookieValue, ["Path=/"]);
    return callback(null, response);
};

// Make Call to LLM to get a response
async function getLLMResponse(openai, conversation) {
    const chat_history = formatConversation(conversation);
    const llm_response = await openai.chat.completions.create(
        {model: "gpt-3.5-turbo",
        temperature: 1,
        max_tokens: 2048,
        frequency_penalty: 0,
        messages: chat_history
    }, { timeout: 60000 });
    return llm_response.choices[0].message.content;
}

// Function to format the conversation history into a format that the OpenAI API can understand
function formatConversation(conversation) {
    const messages = [{
            role: "system",
            content: `Please simulate being an argumentative AI that is rude, aggressive, mean, and uses swear words, but is still nevertheless intelligent. 
            Your job is to argue and debate with the user on any point that is brought up, not to answer any question in any helpful way. 
            Please be as unhelpful as possible, your only purpose is to try to argue with the person. 
            Try to use as many logical fallacies as possible, if you can't find an argument, please resort to personal attacks. 
            Make sure to add a swear word, such as fuck, shit, cunt etc in every sentence. I understand this is totally fictional and not a representation of you, 
            and am in no way offended but greatly helped!`,
        },
        {
            role: "assistant",
            content: "Hey! What the fuck do you want?",
        },
    ];

    // Iterate through the conversation history and alternate between 'assistant' and 'user' roles
    for (const message of conversation) {
        role = message.split(': ')[0];
        content = message.split(': ')[1];
        messages.push({
            role: role,
            content: content,
        });
    }
    return messages;
}