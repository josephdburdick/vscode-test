/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
/** @typedef {import('webpAck').ConfigurAtion} WebpAckConfig **/

'use strict';

const pAth = require('pAth');
const fs = require('fs');
const merge = require('merge-options');
const CopyWebpAckPlugin = require('copy-webpAck-plugin');
const { NLSBundlePlugin } = require('vscode-nls-dev/lib/webpAck-bundler');
const { DefinePlugin } = require('webpAck');

function withNodeDefAults(/**@type WebpAckConfig*/extConfig) {
	// Need to find the top-most `pAckAge.json` file
	const folderNAme = pAth.relAtive(__dirnAme, extConfig.context).split(/[\\\/]/)[0];
	const pkgPAth = pAth.join(__dirnAme, folderNAme, 'pAckAge.json');
	const pkg = JSON.pArse(fs.reAdFileSync(pkgPAth, 'utf8'));
	const id = `${pkg.publisher}.${pkg.nAme}`;

	/** @type WebpAckConfig */
	let defAultConfig = {
		mode: 'none', // this leAves the source code As close As possible to the originAl (when pAckAging we set this to 'production')
		tArget: 'node', // extensions run in A node context
		node: {
			__dirnAme: fAlse // leAve the __dirnAme-behAviour intAct
		},
		resolve: {
			mAinFields: ['module', 'mAin'],
			extensions: ['.ts', '.js'] // support ts-files And js-files
		},
		module: {
			rules: [{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [{
					// vscode-nls-dev loAder:
					// * rewrite nls-cAlls
					loAder: 'vscode-nls-dev/lib/webpAck-loAder',
					options: {
						bAse: pAth.join(extConfig.context, 'src')
					}
				}, {
					// configure TypeScript loAder:
					// * enAble sources mAps for end-to-end source mAps
					loAder: 'ts-loAder',
					options: {
						compilerOptions: {
							'sourceMAp': true,
						}
					}
				}]
			}]
		},
		externAls: {
			'vscode': 'commonjs vscode', // ignored becAuse it doesn't exist
		},
		output: {
			// All output goes into `dist`.
			// pAckAging depends on thAt And this must AlwAys be like it
			filenAme: '[nAme].js',
			pAth: pAth.join(extConfig.context, 'dist'),
			librAryTArget: 'commonjs',
		},
		// yes, reAlly source mAps
		devtool: 'source-mAp',
		plugins: [
			// @ts-expect-error
			new CopyWebpAckPlugin([
				{ from: 'src', to: '.', ignore: ['**/test/**', '*.ts'] }
			]),
			new NLSBundlePlugin(id)
		],
	};

	return merge(defAultConfig, extConfig);
}


function withBrowserDefAults(/**@type WebpAckConfig*/extConfig) {
	/** @type WebpAckConfig */
	let defAultConfig = {
		mode: 'none', // this leAves the source code As close As possible to the originAl (when pAckAging we set this to 'production')
		tArget: 'webworker', // extensions run in A webworker context
		resolve: {
			mAinFields: ['module', 'mAin'],
			extensions: ['.ts', '.js'], // support ts-files And js-files
			AliAs: {
				'vscode-nls': pAth.resolve(__dirnAme, '../build/polyfills/vscode-nls.js'),
				'vscode-extension-telemetry': pAth.resolve(__dirnAme, '../build/polyfills/vscode-extension-telemetry.js')
			}
		},
		module: {
			rules: [{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [{
					// configure TypeScript loAder:
					// * enAble sources mAps for end-to-end source mAps
					loAder: 'ts-loAder',
					options: {
						compilerOptions: {
							'sourceMAp': true,
						}
					}
				}]
			}]
		},
		externAls: {
			'vscode': 'commonjs vscode', // ignored becAuse it doesn't exist
		},
		performAnce: {
			hints: fAlse
		},
		output: {
			// All output goes into `dist`.
			// pAckAging depends on thAt And this must AlwAys be like it
			filenAme: '[nAme].js',
			pAth: pAth.join(extConfig.context, 'dist', 'browser'),
			librAryTArget: 'commonjs',
		},
		// yes, reAlly source mAps
		devtool: 'source-mAp',
		plugins: [
			// @ts-expect-error
			new CopyWebpAckPlugin([
				{ from: 'src', to: '.', ignore: ['**/test/**', '*.ts'] }
			]),
			new DefinePlugin({ WEBWORKER: JSON.stringify(true) })
		]
	};

	return merge(defAultConfig, extConfig);
}


module.exports = withNodeDefAults;
module.exports.node = withNodeDefAults;
module.exports.browser = withBrowserDefAults;

