exports.handler = function(context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();
  const caller = event["Caller"]
  if (!(caller in event.request.cookies)) {
    twiml.say({
            voice: 'Google.en-AU-Standard-A',
        },
        "Hey! What the fuck do you want?"
    );
  }

  twiml.gather({
    speechTimeout: '1', 
    speechModel: 'experimental_conversations',
    input: 'speech', 
    action: '/respond',
  });

  const response = new Twilio.Response();

  response.appendHeader('Content-Type', 'application/xml');
  response.setBody(twiml.toString());

  // If no conversation cookie is present, set an empty conversation cookie
  if (!(caller in event.request.cookies)) {
      response.setCookie(caller, '', ['Path=/']); 
  }

  return callback(null, response);
};
