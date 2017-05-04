'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const moment = require('moment');
const uuid = require('uuid');


let invokeUrl = '***INSERT INVOKE URL HERE***';


module.exports = function(event, context, callback) {
	let sequelize;
	let service = event.queryStringParameters.service;

	return Promise.resolve()
		.then(function() {
			try {
				assert(process.env.HOST != null, 'Unspecified RDS host.');
				assert(process.env.PORT != null, 'Unspecified RDS port.');
				assert(process.env.USER != null, 'Unspecified RDS user.');
				assert(process.env.PASSWORD != null, 'Unspecified RDS password.');
				assert(process.env.DATABASE != null, 'Unspecified RDS database.');
			} catch(err) {
				return Promise.reject(err);
			}

			sequelize = new Sequelize(process.env.DATABASE, process.env.USER, process.env.PASSWORD, {
				host: process.env.HOST,
				port: process.env.PORT,
				dialect: 'mysql'
			});

			return Promise.resolve();
		})
		.then(function() {
			let mapId;

			switch (service) {
				case 'github':
					mapId = process.env.GITHUB_MAP_ID;
					break;

				case 'facebook':
					mapId = process.env.FACEBOOK_MAP_ID;
					break;

				case 'google':
					mapId = process.env.GOOGLE_MAP_ID;
					break;

				case 'twitter':
					mapId = process.env.TWITTER_MAP_ID;
					break;

				default:
					callback(null, {
						statusCode: 400,
						body: 'You must specify a valid service to login with.'
					});
			}

			//Create a Connection using the appropriate Map ID.
			//This will return an object containing the Connection ID and a redirect URL that you need to redirect the user to
			//so that they can authorize your app to access their information.
			//The redirect URL specified in the Map can be overridden by passing one in the body when creating the Connection.
			//In this demo, this is useful for setting the 'type' parameter based on whether the user is signing up or logging in,
			//which changes how the login completion logic should function.
			let bitscoop = global.env.bitscoop;

			return bitscoop.createConnection(mapId, {
				redirect_url: invokeUrl + '/complete?type=login&service=' + service
			});
		})
		.then(function(result) {
			let connectionId = result.id;
			let redirectUrl = result.redirectUrl;

			let token = uuid().replace(/-/g, '');
			let expiration = moment.utc().add(30, 'seconds').toDate();

			let associationSessions = sequelize.define('association_session', {
				id: {
					type: Sequelize.INTEGER,
					primaryKey: true,
					autoIncrement: true
				},
				token: {
					type: Sequelize.STRING
				},
				connectionId: {
					type: Sequelize.STRING,
					field: 'connection_id'
				}
			}, {
				timestamps: false
			});

			var cookieString = 'social_demo_session_id=' + token + '; domain=' + process.env.SITE_DOMAIN + '; expires=' + expiration + '; secure=true; http_only=true';

			return associationSessions.sync()
				.then(function() {
					return associationSessions.create({
						token: token,
						connectionId: connectionId
					});
				})
				.then(function() {
					sequelize.close();

					var response = {
						statusCode: 302,
						headers: {
							'Set-Cookie' : cookieString,
							Location: redirectUrl
						}
					};

					callback(null, response);
				});
		})
		.catch(function(err) {
			if (sequelize) {
				sequelize.close();
			}

			console.log(err);

			callback(null, {
				statusCode: 404,
				body: err.toString()
			});

			return Promise.reject(err);
		});
};
