'use strict';

const Sequelize = require('sequelize');


module.exports = function(sequelize, cookie) {
	return Promise.resolve()
		.then(function() {
			let sessions = sequelize.define('session', {
				id: {
					type: Sequelize.INTEGER,
					primaryKey: true,
					autoIncrement: true
				},
				user: {
					type: Sequelize.INTEGER
				},
				token: {
					type: Sequelize.STRING
				}
			}, {
				timestamps: false
			});

			let users = sequelize.define('user', {
				id: {
					type: Sequelize.INTEGER,
					primaryKey: true,
					autoIncrement: true
				},
				username: {
					type: Sequelize.STRING
				},
				githubId: {
					type: Sequelize.STRING,
					field: 'github_id'
				},
				googleId: {
					type: Sequelize.STRING,
					field: 'google_id'
				},
				facebookId: {
					type: Sequelize.STRING,
					field: 'facebook_id'
				},
				twitterId: {
					type: Sequelize.STRING,
					field: 'twitter_id'
				},
				instagramId: {
					type: Sequelize.STRING,
					field: 'instagram_id'
				},
				email: {
					type: Sequelize.STRING
				},
				upperEmail: {
					type: Sequelize.STRING,
					field: '_upper_email'
				},
				firstName: {
					type: Sequelize.STRING,
					field: 'first_name'
				},
				lastName: {
					type: Sequelize.STRING,
					field: 'last_name'
				},
				joined: {
					type: Sequelize.DATE
				},
				connectionId: {
					type: Sequelize.STRING,
					field: 'connection_id'
				}
			}, {
				timestamps: false
			});

			return Promise.all([
					sessions.sync(),
					users.sync()
				])
				.then(function() {
					return sessions.findOne({
						where: {
							token: cookie
						}
					});
				})
				.then(function(session) {
					if (session) {
						return users.findOne({
							where: {
								id: session.user
							}
						})
							.then(function(user) {
								return Promise.resolve([session, user]);
							});
					}
					else {
						return Promise.resolve([null, null]);
					}
				});
		})
		.catch(function(err) {
			return Promise.reject(err);
		});
};
