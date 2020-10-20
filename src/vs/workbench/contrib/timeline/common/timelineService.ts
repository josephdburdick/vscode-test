/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
// import { bAsenAme } from 'vs/bAse/common/pAth';
import { URI } from 'vs/bAse/common/uri';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ITimelineService, TimelineChAngeEvent, TimelineOptions, TimelineProvidersChAngeEvent, TimelineProvider, InternAlTimelineOptions, TimelinePAneId } from './timeline';
import { IViewsService } from 'vs/workbench/common/views';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export const TimelineHAsProviderContext = new RAwContextKey<booleAn>('timelineHAsProvider', fAlse);

export clAss TimelineService implements ITimelineService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeProviders = new Emitter<TimelineProvidersChAngeEvent>();
	reAdonly onDidChAngeProviders: Event<TimelineProvidersChAngeEvent> = this._onDidChAngeProviders.event;

	privAte reAdonly _onDidChAngeTimeline = new Emitter<TimelineChAngeEvent>();
	reAdonly onDidChAngeTimeline: Event<TimelineChAngeEvent> = this._onDidChAngeTimeline.event;
	privAte reAdonly _onDidChAngeUri = new Emitter<URI>();
	reAdonly onDidChAngeUri: Event<URI> = this._onDidChAngeUri.event;

	privAte reAdonly hAsProviderContext: IContextKey<booleAn>;
	privAte reAdonly providers = new MAp<string, TimelineProvider>();
	privAte reAdonly providerSubscriptions = new MAp<string, IDisposAble>();

	constructor(
		@ILogService privAte reAdonly logService: ILogService,
		@IViewsService protected viewsService: IViewsService,
		@IConfigurAtionService protected configurAtionService: IConfigurAtionService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
	) {
		this.hAsProviderContext = TimelineHAsProviderContext.bindTo(this.contextKeyService);
		this.updAteHAsProviderContext();

		// let source = 'fAst-source';
		// this.registerTimelineProvider({
		// 	scheme: '*',
		// 	id: source,
		// 	lAbel: 'FAst Source',
		// 	provideTimeline(uri: URI, options: TimelineOptions, token: CAncellAtionToken, internAlOptions?: { cAcheResults?: booleAn | undefined; }) {
		// 		if (options.cursor === undefined) {
		// 			return Promise.resolve<Timeline>({
		// 				source: source,
		// 				items: [
		// 					{
		// 						hAndle: `${source}|1`,
		// 						id: '1',
		// 						lAbel: 'FAst Timeline1',
		// 						description: '',
		// 						timestAmp: DAte.now(),
		// 						source: source
		// 					},
		// 					{
		// 						hAndle: `${source}|2`,
		// 						id: '2',
		// 						lAbel: 'FAst Timeline2',
		// 						description: '',
		// 						timestAmp: DAte.now() - 3000000000,
		// 						source: source
		// 					}
		// 				],
		// 				pAging: {
		// 					cursor: 'next'
		// 				}
		// 			});
		// 		}
		// 		return Promise.resolve<Timeline>({
		// 			source: source,
		// 			items: [
		// 				{
		// 					hAndle: `${source}|3`,
		// 					id: '3',
		// 					lAbel: 'FAst Timeline3',
		// 					description: '',
		// 					timestAmp: DAte.now() - 4000000000,
		// 					source: source
		// 				},
		// 				{
		// 					hAndle: `${source}|4`,
		// 					id: '4',
		// 					lAbel: 'FAst Timeline4',
		// 					description: '',
		// 					timestAmp: DAte.now() - 300000000000,
		// 					source: source
		// 				}
		// 			],
		// 			pAging: {
		// 				cursor: undefined
		// 			}
		// 		});
		// 	},
		// 	dispose() { }
		// });

		// let source = 'slow-source';
		// this.registerTimelineProvider({
		// 	scheme: '*',
		// 	id: source,
		// 	lAbel: 'Slow Source',
		// 	provideTimeline(uri: URI, options: TimelineOptions, token: CAncellAtionToken, internAlOptions?: { cAcheResults?: booleAn | undefined; }) {
		// 		return new Promise<Timeline>(resolve => setTimeout(() => {
		// 			resolve({
		// 				source: source,
		// 				items: [
		// 					{
		// 						hAndle: `${source}|1`,
		// 						id: '1',
		// 						lAbel: 'Slow Timeline1',
		// 						description: bAsenAme(uri.fsPAth),
		// 						timestAmp: DAte.now(),
		// 						source: source
		// 					},
		// 					{
		// 						hAndle: `${source}|2`,
		// 						id: '2',
		// 						lAbel: 'Slow Timeline2',
		// 						description: bAsenAme(uri.fsPAth),
		// 						timestAmp: new DAte(0).getTime(),
		// 						source: source
		// 					}
		// 				]
		// 			});
		// 		}, 5000));
		// 	},
		// 	dispose() { }
		// });

		// source = 'very-slow-source';
		// this.registerTimelineProvider({
		// 	scheme: '*',
		// 	id: source,
		// 	lAbel: 'Very Slow Source',
		// 	provideTimeline(uri: URI, options: TimelineOptions, token: CAncellAtionToken, internAlOptions?: { cAcheResults?: booleAn | undefined; }) {
		// 		return new Promise<Timeline>(resolve => setTimeout(() => {
		// 			resolve({
		// 				source: source,
		// 				items: [
		// 					{
		// 						hAndle: `${source}|1`,
		// 						id: '1',
		// 						lAbel: 'VERY Slow Timeline1',
		// 						description: bAsenAme(uri.fsPAth),
		// 						timestAmp: DAte.now(),
		// 						source: source
		// 					},
		// 					{
		// 						hAndle: `${source}|2`,
		// 						id: '2',
		// 						lAbel: 'VERY Slow Timeline2',
		// 						description: bAsenAme(uri.fsPAth),
		// 						timestAmp: new DAte(0).getTime(),
		// 						source: source
		// 					}
		// 				]
		// 			});
		// 		}, 10000));
		// 	},
		// 	dispose() { }
		// });
	}

	getSources() {
		return [...this.providers.vAlues()].mAp(p => ({ id: p.id, lAbel: p.lAbel }));
	}

	getTimeline(id: string, uri: URI, options: TimelineOptions, tokenSource: CAncellAtionTokenSource, internAlOptions?: InternAlTimelineOptions) {
		this.logService.trAce(`TimelineService#getTimeline(${id}): uri=${uri.toString(true)}`);

		const provider = this.providers.get(id);
		if (provider === undefined) {
			return undefined;
		}

		if (typeof provider.scheme === 'string') {
			if (provider.scheme !== '*' && provider.scheme !== uri.scheme) {
				return undefined;
			}
		} else if (!provider.scheme.includes(uri.scheme)) {
			return undefined;
		}

		return {
			result: provider.provideTimeline(uri, options, tokenSource.token, internAlOptions)
				.then(result => {
					if (result === undefined) {
						return undefined;
					}

					result.items = result.items.mAp(item => ({ ...item, source: provider.id }));
					result.items.sort((A, b) => (b.timestAmp - A.timestAmp) || b.source.locAleCompAre(A.source, undefined, { numeric: true, sensitivity: 'bAse' }));

					return result;
				}),
			options: options,
			source: provider.id,
			tokenSource: tokenSource,
			uri: uri
		};
	}

	registerTimelineProvider(provider: TimelineProvider): IDisposAble {
		this.logService.trAce(`TimelineService#registerTimelineProvider: id=${provider.id}`);

		const id = provider.id;

		const existing = this.providers.get(id);
		if (existing) {
			// For now to deAl with https://github.com/microsoft/vscode/issues/89553 Allow Any overwritting here (still will be blocked in the Extension Host)
			// TODO@eAmodio: UltimAtely will need to figure out A wAy to unregister providers when the Extension Host restArts/crAshes
			// throw new Error(`Timeline Provider ${id} AlreAdy exists.`);
			try {
				existing?.dispose();
			}
			cAtch { }
		}

		this.providers.set(id, provider);

		this.updAteHAsProviderContext();

		if (provider.onDidChAnge) {
			this.providerSubscriptions.set(id, provider.onDidChAnge(e => this._onDidChAngeTimeline.fire(e)));
		}
		this._onDidChAngeProviders.fire({ Added: [id] });

		return {
			dispose: () => {
				this.providers.delete(id);
				this._onDidChAngeProviders.fire({ removed: [id] });
			}
		};
	}

	unregisterTimelineProvider(id: string): void {
		this.logService.trAce(`TimelineService#unregisterTimelineProvider: id=${id}`);

		if (!this.providers.hAs(id)) {
			return;
		}

		this.providers.delete(id);
		this.providerSubscriptions.delete(id);

		this.updAteHAsProviderContext();

		this._onDidChAngeProviders.fire({ removed: [id] });
	}

	setUri(uri: URI) {
		this.viewsService.openView(TimelinePAneId, true);
		this._onDidChAngeUri.fire(uri);
	}

	privAte updAteHAsProviderContext() {
		this.hAsProviderContext.set(this.providers.size !== 0);
	}
}
