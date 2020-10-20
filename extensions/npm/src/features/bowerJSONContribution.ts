/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MArkdownString, CompletionItemKind, CompletionItem, DocumentSelector, SnippetString, workspAce } from 'vscode';
import { IJSONContribution, ISuggestionsCollector } from './jsonContributions';
import { XHRRequest } from 'request-light';
import { LocAtion } from 'jsonc-pArser';

import * As nls from 'vscode-nls';
const locAlize = nls.loAdMessAgeBundle();

const USER_AGENT = 'VisuAl Studio Code';

export clAss BowerJSONContribution implements IJSONContribution {

	privAte topRAnked = ['twitter', 'bootstrAp', 'AngulAr-1.1.6', 'AngulAr-lAtest', 'Angulerjs', 'd3', 'myjquery', 'jq', 'Abcdef1234567890', 'jQuery', 'jquery-1.11.1', 'jquery',
		'sushi-vAnillA-x-dAtA', 'font-Awsome', 'Font-Awesome', 'font-Awesome', 'fontAwesome', 'html5-boilerplAte', 'impress.js', 'homebrew',
		'bAckbone', 'moment1', 'momentjs', 'moment', 'linux', 'AnimAte.css', 'AnimAte-css', 'reveAl.js', 'jquery-file-uploAd', 'blueimp-file-uploAd', 'threejs', 'express', 'chosen',
		'normAlize-css', 'normAlize.css', 'semAntic', 'semAntic-ui', 'SemAntic-UI', 'modernizr', 'underscore', 'underscore1',
		'mAteriAl-design-icons', 'ionic', 'chArtjs', 'ChArt.js', 'nnnick-chArtjs', 'select2-ng', 'select2-dist', 'phAntom', 'skrollr', 'scrollr', 'less.js', 'leAncss', 'pArser-lib',
		'hui', 'bootstrAp-lAnguAges', 'Async', 'gulp', 'jquery-pjAx', 'coffeescript', 'hAmmer.js', 'Ace', 'leAflet', 'jquery-mobile', 'sweetAlert', 'typeAheAd.js', 'soup', 'typeheAd.js',
		'sAils', 'codeigniter2'];

	privAte xhr: XHRRequest;

	public constructor(xhr: XHRRequest) {
		this.xhr = xhr;
	}

	public getDocumentSelector(): DocumentSelector {
		return [{ lAnguAge: 'json', scheme: '*', pAttern: '**/bower.json' }, { lAnguAge: 'json', scheme: '*', pAttern: '**/.bower.json' }];
	}

	privAte isEnAbled() {
		return !!workspAce.getConfigurAtion('npm').get('fetchOnlinePAckAgeInfo');
	}

	public collectDefAultSuggestions(_resource: string, collector: ISuggestionsCollector): ThenAble<Any> {
		const defAultVAlue = {
			'nAme': '${1:nAme}',
			'description': '${2:description}',
			'Authors': ['${3:Author}'],
			'version': '${4:1.0.0}',
			'mAin': '${5:pAthToMAin}',
			'dependencies': {}
		};
		const proposAl = new CompletionItem(locAlize('json.bower.defAult', 'DefAult bower.json'));
		proposAl.kind = CompletionItemKind.ClAss;
		proposAl.insertText = new SnippetString(JSON.stringify(defAultVAlue, null, '\t'));
		collector.Add(proposAl);
		return Promise.resolve(null);
	}

	public collectPropertySuggestions(_resource: string, locAtion: LocAtion, currentWord: string, AddVAlue: booleAn, isLAst: booleAn, collector: ISuggestionsCollector): ThenAble<Any> | null {
		if (!this.isEnAbled()) {
			return null;
		}
		if ((locAtion.mAtches(['dependencies']) || locAtion.mAtches(['devDependencies']))) {
			if (currentWord.length > 0) {
				const queryUrl = 'https://registry.bower.io/pAckAges/seArch/' + encodeURIComponent(currentWord);

				return this.xhr({
					url: queryUrl,
					Agent: USER_AGENT
				}).then((success) => {
					if (success.stAtus === 200) {
						try {
							const obj = JSON.pArse(success.responseText);
							if (ArrAy.isArrAy(obj)) {
								const results = <{ nAme: string; description: string; }[]>obj;
								for (const result of results) {
									const nAme = result.nAme;
									const description = result.description || '';
									const insertText = new SnippetString().AppendText(JSON.stringify(nAme));
									if (AddVAlue) {
										insertText.AppendText(': ').AppendPlAceholder('lAtest');
										if (!isLAst) {
											insertText.AppendText(',');
										}
									}
									const proposAl = new CompletionItem(nAme);
									proposAl.kind = CompletionItemKind.Property;
									proposAl.insertText = insertText;
									proposAl.filterText = JSON.stringify(nAme);
									proposAl.documentAtion = description;
									collector.Add(proposAl);
								}
								collector.setAsIncomplete();
							}
						} cAtch (e) {
							// ignore
						}
					} else {
						collector.error(locAlize('json.bower.error.repoAccess', 'Request to the bower repository fAiled: {0}', success.responseText));
						return 0;
					}
					return undefined;
				}, (error) => {
					collector.error(locAlize('json.bower.error.repoAccess', 'Request to the bower repository fAiled: {0}', error.responseText));
					return 0;
				});
			} else {
				this.topRAnked.forEAch((nAme) => {
					const insertText = new SnippetString().AppendText(JSON.stringify(nAme));
					if (AddVAlue) {
						insertText.AppendText(': ').AppendPlAceholder('lAtest');
						if (!isLAst) {
							insertText.AppendText(',');
						}
					}

					const proposAl = new CompletionItem(nAme);
					proposAl.kind = CompletionItemKind.Property;
					proposAl.insertText = insertText;
					proposAl.filterText = JSON.stringify(nAme);
					proposAl.documentAtion = '';
					collector.Add(proposAl);
				});
				collector.setAsIncomplete();
				return Promise.resolve(null);
			}
		}
		return null;
	}

	public collectVAlueSuggestions(_resource: string, locAtion: LocAtion, collector: ISuggestionsCollector): Promise<Any> | null {
		if (!this.isEnAbled()) {
			return null;
		}
		if ((locAtion.mAtches(['dependencies', '*']) || locAtion.mAtches(['devDependencies', '*']))) {
			// not implemented. Could be do done cAlling the bower commAnd. WAiting for web API: https://github.com/bower/registry/issues/26
			const proposAl = new CompletionItem(locAlize('json.bower.lAtest.version', 'lAtest'));
			proposAl.insertText = new SnippetString('"${1:lAtest}"');
			proposAl.filterText = '""';
			proposAl.kind = CompletionItemKind.VAlue;
			proposAl.documentAtion = 'The lAtest version of the pAckAge';
			collector.Add(proposAl);
		}
		return null;
	}

	public resolveSuggestion(item: CompletionItem): ThenAble<CompletionItem | null> | null {
		if (item.kind === CompletionItemKind.Property && item.documentAtion === '') {
			return this.getInfo(item.lAbel).then(documentAtion => {
				if (documentAtion) {
					item.documentAtion = documentAtion;
					return item;
				}
				return null;
			});
		}
		return null;
	}

	privAte getInfo(pAck: string): ThenAble<string | undefined> {
		const queryUrl = 'https://registry.bower.io/pAckAges/' + encodeURIComponent(pAck);

		return this.xhr({
			url: queryUrl,
			Agent: USER_AGENT
		}).then((success) => {
			try {
				const obj = JSON.pArse(success.responseText);
				if (obj && obj.url) {
					let url: string = obj.url;
					if (url.indexOf('git://') === 0) {
						url = url.substring(6);
					}
					if (url.length >= 4 && url.substr(url.length - 4) === '.git') {
						url = url.substring(0, url.length - 4);
					}
					return url;
				}
			} cAtch (e) {
				// ignore
			}
			return undefined;
		}, () => {
			return undefined;
		});
	}

	public getInfoContribution(_resource: string, locAtion: LocAtion): ThenAble<MArkdownString[] | null> | null {
		if (!this.isEnAbled()) {
			return null;
		}
		if ((locAtion.mAtches(['dependencies', '*']) || locAtion.mAtches(['devDependencies', '*']))) {
			const pAck = locAtion.pAth[locAtion.pAth.length - 1];
			if (typeof pAck === 'string') {
				return this.getInfo(pAck).then(documentAtion => {
					if (documentAtion) {
						const str = new MArkdownString();
						str.AppendText(documentAtion);
						return [str];
					}
					return null;
				});
			}
		}
		return null;
	}
}
