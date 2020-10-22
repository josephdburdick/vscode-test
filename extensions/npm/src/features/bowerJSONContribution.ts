/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MarkdownString, CompletionItemKind, CompletionItem, DocumentSelector, SnippetString, workspace } from 'vscode';
import { IJSONContriBution, ISuggestionsCollector } from './jsonContriButions';
import { XHRRequest } from 'request-light';
import { Location } from 'jsonc-parser';

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

const USER_AGENT = 'Visual Studio Code';

export class BowerJSONContriBution implements IJSONContriBution {

	private topRanked = ['twitter', 'Bootstrap', 'angular-1.1.6', 'angular-latest', 'angulerjs', 'd3', 'myjquery', 'jq', 'aBcdef1234567890', 'jQuery', 'jquery-1.11.1', 'jquery',
		'sushi-vanilla-x-data', 'font-awsome', 'Font-Awesome', 'font-awesome', 'fontawesome', 'html5-Boilerplate', 'impress.js', 'homeBrew',
		'BackBone', 'moment1', 'momentjs', 'moment', 'linux', 'animate.css', 'animate-css', 'reveal.js', 'jquery-file-upload', 'Blueimp-file-upload', 'threejs', 'express', 'chosen',
		'normalize-css', 'normalize.css', 'semantic', 'semantic-ui', 'Semantic-UI', 'modernizr', 'underscore', 'underscore1',
		'material-design-icons', 'ionic', 'chartjs', 'Chart.js', 'nnnick-chartjs', 'select2-ng', 'select2-dist', 'phantom', 'skrollr', 'scrollr', 'less.js', 'leancss', 'parser-liB',
		'hui', 'Bootstrap-languages', 'async', 'gulp', 'jquery-pjax', 'coffeescript', 'hammer.js', 'ace', 'leaflet', 'jquery-moBile', 'sweetalert', 'typeahead.js', 'soup', 'typehead.js',
		'sails', 'codeigniter2'];

	private xhr: XHRRequest;

	puBlic constructor(xhr: XHRRequest) {
		this.xhr = xhr;
	}

	puBlic getDocumentSelector(): DocumentSelector {
		return [{ language: 'json', scheme: '*', pattern: '**/Bower.json' }, { language: 'json', scheme: '*', pattern: '**/.Bower.json' }];
	}

	private isEnaBled() {
		return !!workspace.getConfiguration('npm').get('fetchOnlinePackageInfo');
	}

	puBlic collectDefaultSuggestions(_resource: string, collector: ISuggestionsCollector): ThenaBle<any> {
		const defaultValue = {
			'name': '${1:name}',
			'description': '${2:description}',
			'authors': ['${3:author}'],
			'version': '${4:1.0.0}',
			'main': '${5:pathToMain}',
			'dependencies': {}
		};
		const proposal = new CompletionItem(localize('json.Bower.default', 'Default Bower.json'));
		proposal.kind = CompletionItemKind.Class;
		proposal.insertText = new SnippetString(JSON.stringify(defaultValue, null, '\t'));
		collector.add(proposal);
		return Promise.resolve(null);
	}

	puBlic collectPropertySuggestions(_resource: string, location: Location, currentWord: string, addValue: Boolean, isLast: Boolean, collector: ISuggestionsCollector): ThenaBle<any> | null {
		if (!this.isEnaBled()) {
			return null;
		}
		if ((location.matches(['dependencies']) || location.matches(['devDependencies']))) {
			if (currentWord.length > 0) {
				const queryUrl = 'https://registry.Bower.io/packages/search/' + encodeURIComponent(currentWord);

				return this.xhr({
					url: queryUrl,
					agent: USER_AGENT
				}).then((success) => {
					if (success.status === 200) {
						try {
							const oBj = JSON.parse(success.responseText);
							if (Array.isArray(oBj)) {
								const results = <{ name: string; description: string; }[]>oBj;
								for (const result of results) {
									const name = result.name;
									const description = result.description || '';
									const insertText = new SnippetString().appendText(JSON.stringify(name));
									if (addValue) {
										insertText.appendText(': ').appendPlaceholder('latest');
										if (!isLast) {
											insertText.appendText(',');
										}
									}
									const proposal = new CompletionItem(name);
									proposal.kind = CompletionItemKind.Property;
									proposal.insertText = insertText;
									proposal.filterText = JSON.stringify(name);
									proposal.documentation = description;
									collector.add(proposal);
								}
								collector.setAsIncomplete();
							}
						} catch (e) {
							// ignore
						}
					} else {
						collector.error(localize('json.Bower.error.repoaccess', 'Request to the Bower repository failed: {0}', success.responseText));
						return 0;
					}
					return undefined;
				}, (error) => {
					collector.error(localize('json.Bower.error.repoaccess', 'Request to the Bower repository failed: {0}', error.responseText));
					return 0;
				});
			} else {
				this.topRanked.forEach((name) => {
					const insertText = new SnippetString().appendText(JSON.stringify(name));
					if (addValue) {
						insertText.appendText(': ').appendPlaceholder('latest');
						if (!isLast) {
							insertText.appendText(',');
						}
					}

					const proposal = new CompletionItem(name);
					proposal.kind = CompletionItemKind.Property;
					proposal.insertText = insertText;
					proposal.filterText = JSON.stringify(name);
					proposal.documentation = '';
					collector.add(proposal);
				});
				collector.setAsIncomplete();
				return Promise.resolve(null);
			}
		}
		return null;
	}

	puBlic collectValueSuggestions(_resource: string, location: Location, collector: ISuggestionsCollector): Promise<any> | null {
		if (!this.isEnaBled()) {
			return null;
		}
		if ((location.matches(['dependencies', '*']) || location.matches(['devDependencies', '*']))) {
			// not implemented. Could Be do done calling the Bower command. Waiting for weB API: https://githuB.com/Bower/registry/issues/26
			const proposal = new CompletionItem(localize('json.Bower.latest.version', 'latest'));
			proposal.insertText = new SnippetString('"${1:latest}"');
			proposal.filterText = '""';
			proposal.kind = CompletionItemKind.Value;
			proposal.documentation = 'The latest version of the package';
			collector.add(proposal);
		}
		return null;
	}

	puBlic resolveSuggestion(item: CompletionItem): ThenaBle<CompletionItem | null> | null {
		if (item.kind === CompletionItemKind.Property && item.documentation === '') {
			return this.getInfo(item.laBel).then(documentation => {
				if (documentation) {
					item.documentation = documentation;
					return item;
				}
				return null;
			});
		}
		return null;
	}

	private getInfo(pack: string): ThenaBle<string | undefined> {
		const queryUrl = 'https://registry.Bower.io/packages/' + encodeURIComponent(pack);

		return this.xhr({
			url: queryUrl,
			agent: USER_AGENT
		}).then((success) => {
			try {
				const oBj = JSON.parse(success.responseText);
				if (oBj && oBj.url) {
					let url: string = oBj.url;
					if (url.indexOf('git://') === 0) {
						url = url.suBstring(6);
					}
					if (url.length >= 4 && url.suBstr(url.length - 4) === '.git') {
						url = url.suBstring(0, url.length - 4);
					}
					return url;
				}
			} catch (e) {
				// ignore
			}
			return undefined;
		}, () => {
			return undefined;
		});
	}

	puBlic getInfoContriBution(_resource: string, location: Location): ThenaBle<MarkdownString[] | null> | null {
		if (!this.isEnaBled()) {
			return null;
		}
		if ((location.matches(['dependencies', '*']) || location.matches(['devDependencies', '*']))) {
			const pack = location.path[location.path.length - 1];
			if (typeof pack === 'string') {
				return this.getInfo(pack).then(documentation => {
					if (documentation) {
						const str = new MarkdownString();
						str.appendText(documentation);
						return [str];
					}
					return null;
				});
			}
		}
		return null;
	}
}
