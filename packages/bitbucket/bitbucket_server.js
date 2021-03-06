/* eslint-disable no-undef */

// based off of https://github.com/meteor/meteor/blob/devel/packages/github-oauth/github_server.js
// https://developer.atlassian.com/bitbucket/api/2/reference/meta/authentication#oauth-2

Bitbucket = {};

OAuth.registerService('bitbucket', 2, null, query => {
    const tokens = getTokens(query);
    const accessToken = tokens[0];
    const refreshToken = tokens[1];
    const identity = getIdentity(accessToken);
    return {
        serviceData: {
            id: identity.account_id,
            accessToken: OAuth.sealSecret(accessToken),
            refreshToken: refreshToken,
            username: identity.username
        },
        options: { 
            profile: {
                name: identity.display_name
            }
        }
    };
});

let userAgent = 'Meteor';
if (Meteor.release) {
    userAgent += `/${Meteor.release}`;
}

const getTokens = (query) => {
    const config = ServiceConfiguration.configurations.findOne({service: 'bitbucket'});
    if (!config) {
        throw new ServiceConfiguration.ConfigError();
    }

    let response;
    try {
        response = HTTP.post(
            'https://bitbucket.org/site/oauth2/access_token', {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': userAgent
                },
                params: {
                    code: query.code,
                    grant_type: 'authorization_code',
                    client_id: config.consumerKey,
                    client_secret: OAuth.openSecret(config.secret)
                }
            });
    } catch (err) {
        throw Object.assign( 
            new Error(`Failed to complete OAuth handshake with Bitbucket. ${err.message}`), { response: err.response },
        );
    }
    if (response.data.error) {
        throw new Error(`Failed to complete OAuth handshake with Bitbucket. ${response.data.error}`);
    } else {
        return [response.data.access_token, response.data.refresh_token];
    }
};

const getIdentity = (accessToken) => {
    try {
        return HTTP.get(
            'https://bitbucket.org/api/2.0/user', {
                headers: {
                    'User-Agent': userAgent,
                    Authorization: 'Bearer ' + accessToken
                }, 
            }).data;
    } catch (err) {
        throw Object.assign(
            new Error(`Failed to fetch identity from Bitbucket. ${err.message}`), { response: err.response },
        );
    }
};

Bitbucket.retrieveCredential = (credentialToken, credentialSecret) => {
    return OAuth.retrieveCredential(credentialToken, credentialSecret);
};
