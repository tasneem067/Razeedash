/* eslint-disable no-undef */

Ghe = {};

OAuth.registerService('ghe', 2, null, function(query) {

    const accessToken = getAccessToken(query);
    const identity = getIdentity(accessToken);
    const emails = getEmails(accessToken);
    const primaryEmail = emails.find(email => email.primary);

    return {
        serviceData: {
            id: identity.id,
            accessToken: OAuth.sealSecret(accessToken),
            email: identity.email || (primaryEmail && primaryEmail.email) || '',
            username: identity.login,
            emails: emails
        },
        options: { profile: { name: identity.name } }
    };
});

const apiPath = 'api/v3';

// http://developer.github.com/v3/#user-agent-required
let userAgent = 'Meteor';
if (Meteor.release) {
    userAgent += '/' + Meteor.release;
}

const getAccessToken = function(query) {
    const config = ServiceConfiguration.configurations.findOne({ service: 'ghe' });
    if (!config) {
        throw new ServiceConfiguration.ConfigError();
    }

    let response;
    try {
        const gheUrl = sanitizeUrl(config.gheURL);
        response = HTTP.post(`${gheUrl}/login/oauth/access_token`, {
            headers: {
                Accept: 'application/json',
                'User-Agent': userAgent
            },
            params: {
                code: query.code,
                client_id: config.clientId,
                client_secret: OAuth.openSecret(config.secret),
                redirect_uri: OAuth._redirectUri('ghe', config),
                state: query.state
            }
        });
    } catch (err) {
        throw Object.assign(
            new Error(`Failed to complete OAuth handshake with Github Enterprise. ${err.message}`),
            { response: err.response },
        );
    }
    
    if (response.data.error) { // if the http response was a json object with an error attribute
        throw new Error('Failed to complete OAuth handshake with GitHub Enterprise. ' + response.data.error);
    } else {
        return response.data.access_token;
    }
};

const getIdentity = function(accessToken) {
    const config = ServiceConfiguration.configurations.findOne({ service: 'ghe' });
    if (!config) {
        throw new ServiceConfiguration.ConfigError();
    }

    try {
        const gheUrl = sanitizeUrl(config.gheURL);
        return HTTP.get(`${gheUrl}/${apiPath}/user`, {
            headers: {'User-Agent': userAgent, 'Authorization': `token ${accessToken}`},
        }).data;
    } catch (err) {
        throw Object.assign(
            new Error(`Failed to fetch identity from Github. ${err.message}`),
            { response: err.response },
        );
    }
};

const getEmails = function(accessToken) {
    const config = ServiceConfiguration.configurations.findOne({ service: 'ghe' });
    if (!config) {
        throw new ServiceConfiguration.ConfigError();
    }

    try {
        const gheUrl = sanitizeUrl(config.gheURL);
        return HTTP.get( `${gheUrl}/${apiPath}/user/emails`, {
            headers: {'User-Agent': userAgent, 'Authorization': `token ${accessToken}`},
        }).data;
    } catch (err) {
        return [];
    }
};

const sanitizeUrl = (url) => {

    const httpCheck = /^((http|https):\/\/)/;
    if(!httpCheck.test(url)) {
        url = `https://${url}`;
    }

    const trailingSlash = /\/*$/gi;
    const ghe = url.replace(trailingSlash, '');

    return ghe;
};

Ghe.retrieveCredential = function(credentialToken, credentialSecret) {
    return OAuth.retrieveCredential(credentialToken, credentialSecret);
};
