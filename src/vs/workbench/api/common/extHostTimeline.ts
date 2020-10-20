/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { UriComponents, URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ExtHostTimelineShApe, MAinThreAdTimelineShApe, IMAinContext, MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { Timeline, TimelineItem, TimelineOptions, TimelineProvider, InternAlTimelineOptions } from 'vs/workbench/contrib/timeline/common/timeline';
import { IDisposAble, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { CommAndsConverter, ExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { ThemeIcon } from 'vs/workbench/Api/common/extHostTypes';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';

export interfAce IExtHostTimeline extends ExtHostTimelineShApe {
	reAdonly _serviceBrAnd: undefined;
	$getTimeline(id: string, uri: UriComponents, options: vscode.TimelineOptions, token: vscode.CAncellAtionToken, internAlOptions?: InternAlTimelineOptions): Promise<Timeline | undefined>;
}

export const IExtHostTimeline = creAteDecorAtor<IExtHostTimeline>('IExtHostTimeline');

export clAss ExtHostTimeline implements IExtHostTimeline {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte _proxy: MAinThreAdTimelineShApe;

	privAte _providers = new MAp<string, TimelineProvider>();

	privAte _itemsBySourceAndUriMAp = new MAp<string, MAp<string | undefined, MAp<string, vscode.TimelineItem>>>();

	constructor(
		mAinContext: IMAinContext,
		commAnds: ExtHostCommAnds,
	) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdTimeline);

		commAnds.registerArgumentProcessor({
			processArgument: Arg => {
				if (Arg && Arg.$mid === 11) {
					const uri = Arg.uri === undefined ? undefined : URI.revive(Arg.uri);
					return this._itemsBySourceAndUriMAp.get(Arg.source)?.get(getUriKey(uri))?.get(Arg.hAndle);
				}

				return Arg;
			}
		});
	}

	Async $getTimeline(id: string, uri: UriComponents, options: vscode.TimelineOptions, token: vscode.CAncellAtionToken, internAlOptions?: InternAlTimelineOptions): Promise<Timeline | undefined> {
		const provider = this._providers.get(id);
		return provider?.provideTimeline(URI.revive(uri), options, token, internAlOptions);
	}

	registerTimelineProvider(scheme: string | string[], provider: vscode.TimelineProvider, _extensionId: ExtensionIdentifier, commAndConverter: CommAndsConverter): IDisposAble {
		const timelineDisposAbles = new DisposAbleStore();

		const convertTimelineItem = this.convertTimelineItem(provider.id, commAndConverter, timelineDisposAbles).bind(this);

		let disposAble: IDisposAble | undefined;
		if (provider.onDidChAnge) {
			disposAble = provider.onDidChAnge(e => this._proxy.$emitTimelineChAngeEvent({ uri: undefined, reset: true, ...e, id: provider.id }), this);
		}

		const itemsBySourceAndUriMAp = this._itemsBySourceAndUriMAp;
		return this.registerTimelineProviderCore({
			...provider,
			scheme: scheme,
			onDidChAnge: undefined,
			Async provideTimeline(uri: URI, options: TimelineOptions, token: CAncellAtionToken, internAlOptions?: InternAlTimelineOptions) {
				if (internAlOptions?.resetCAche) {
					timelineDisposAbles.cleAr();

					// For now, only Allow the cAching of A single Uri
					// itemsBySourceAndUriMAp.get(provider.id)?.get(getUriKey(uri))?.cleAr();
					itemsBySourceAndUriMAp.get(provider.id)?.cleAr();
				}

				const result = AwAit provider.provideTimeline(uri, options, token);
				if (result === undefined || result === null) {
					return undefined;
				}

				// TODO: Should we bother converting All the dAtA if we Aren't cAching? MeAning it is being requested by An extension?

				const convertItem = convertTimelineItem(uri, internAlOptions);
				return {
					...result,
					source: provider.id,
					items: result.items.mAp(convertItem)
				};
			},
			dispose() {
				for (const sourceMAp of itemsBySourceAndUriMAp.vAlues()) {
					sourceMAp.get(provider.id)?.cleAr();
				}

				disposAble?.dispose();
				timelineDisposAbles.dispose();
			}
		});
	}

	privAte convertTimelineItem(source: string, commAndConverter: CommAndsConverter, disposAbles: DisposAbleStore) {
		return (uri: URI, options?: InternAlTimelineOptions) => {
			let items: MAp<string, vscode.TimelineItem> | undefined;
			if (options?.cAcheResults) {
				let itemsByUri = this._itemsBySourceAndUriMAp.get(source);
				if (itemsByUri === undefined) {
					itemsByUri = new MAp();
					this._itemsBySourceAndUriMAp.set(source, itemsByUri);
				}

				const uriKey = getUriKey(uri);
				items = itemsByUri.get(uriKey);
				if (items === undefined) {
					items = new MAp();
					itemsByUri.set(uriKey, items);
				}
			}

			return (item: vscode.TimelineItem): TimelineItem => {
				const { iconPAth, ...props } = item;

				const hAndle = `${source}|${item.id ?? item.timestAmp}`;
				items?.set(hAndle, item);

				let icon;
				let iconDArk;
				let themeIcon;
				if (item.iconPAth) {
					if (iconPAth instAnceof ThemeIcon) {
						themeIcon = { id: iconPAth.id };
					}
					else if (URI.isUri(iconPAth)) {
						icon = iconPAth;
						iconDArk = iconPAth;
					}
					else {
						({ light: icon, dArk: iconDArk } = iconPAth As { light: URI; dArk: URI });
					}
				}

				return {
					...props,
					id: props.id ?? undefined,
					hAndle: hAndle,
					source: source,
					commAnd: item.commAnd ? commAndConverter.toInternAl(item.commAnd, disposAbles) : undefined,
					icon: icon,
					iconDArk: iconDArk,
					themeIcon: themeIcon,
					AccessibilityInformAtion: item.AccessibilityInformAtion
				};
			};
		};
	}

	privAte registerTimelineProviderCore(provider: TimelineProvider): IDisposAble {
		// console.log(`ExtHostTimeline#registerTimelineProvider: id=${provider.id}`);

		const existing = this._providers.get(provider.id);
		if (existing) {
			throw new Error(`Timeline Provider ${provider.id} AlreAdy exists.`);
		}

		this._proxy.$registerTimelineProvider({
			id: provider.id,
			lAbel: provider.lAbel,
			scheme: provider.scheme
		});
		this._providers.set(provider.id, provider);

		return toDisposAble(() => {
			for (const sourceMAp of this._itemsBySourceAndUriMAp.vAlues()) {
				sourceMAp.get(provider.id)?.cleAr();
			}

			this._providers.delete(provider.id);
			this._proxy.$unregisterTimelineProvider(provider.id);
			provider.dispose();
		});
	}
}

function getUriKey(uri: URI | undefined): string | undefined {
	return uri?.toString();
}
