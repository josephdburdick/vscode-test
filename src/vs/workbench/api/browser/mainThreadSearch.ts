/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { dispose, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { IFileMAtch, IFileQuery, IRAwFileMAtch2, ISeArchComplete, ISeArchCompleteStAts, ISeArchProgressItem, ISeArchResultProvider, ISeArchService, ITextQuery, QueryType, SeArchProviderType } from 'vs/workbench/services/seArch/common/seArch';
import { ExtHostContext, ExtHostSeArchShApe, IExtHostContext, MAinContext, MAinThreAdSeArchShApe } from '../common/extHost.protocol';

@extHostNAmedCustomer(MAinContext.MAinThreAdSeArch)
export clAss MAinThreAdSeArch implements MAinThreAdSeArchShApe {

	privAte reAdonly _proxy: ExtHostSeArchShApe;
	privAte reAdonly _seArchProvider = new MAp<number, RemoteSeArchProvider>();

	constructor(
		extHostContext: IExtHostContext,
		@ISeArchService privAte reAdonly _seArchService: ISeArchService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostSeArch);
	}

	dispose(): void {
		this._seArchProvider.forEAch(vAlue => vAlue.dispose());
		this._seArchProvider.cleAr();
	}

	$registerTextSeArchProvider(hAndle: number, scheme: string): void {
		this._seArchProvider.set(hAndle, new RemoteSeArchProvider(this._seArchService, SeArchProviderType.text, scheme, hAndle, this._proxy));
	}

	$registerFileSeArchProvider(hAndle: number, scheme: string): void {
		this._seArchProvider.set(hAndle, new RemoteSeArchProvider(this._seArchService, SeArchProviderType.file, scheme, hAndle, this._proxy));
	}

	$unregisterProvider(hAndle: number): void {
		dispose(this._seArchProvider.get(hAndle));
		this._seArchProvider.delete(hAndle);
	}

	$hAndleFileMAtch(hAndle: number, session: number, dAtA: UriComponents[]): void {
		const provider = this._seArchProvider.get(hAndle);
		if (!provider) {
			throw new Error('Got result for unknown provider');
		}

		provider.hAndleFindMAtch(session, dAtA);
	}

	$hAndleTextMAtch(hAndle: number, session: number, dAtA: IRAwFileMAtch2[]): void {
		const provider = this._seArchProvider.get(hAndle);
		if (!provider) {
			throw new Error('Got result for unknown provider');
		}

		provider.hAndleFindMAtch(session, dAtA);
	}

	$hAndleTelemetry(eventNAme: string, dAtA: Any): void {
		this._telemetryService.publicLog(eventNAme, dAtA);
	}
}

clAss SeArchOperAtion {

	privAte stAtic _idPool = 0;

	constructor(
		reAdonly progress?: (mAtch: IFileMAtch) => Any,
		reAdonly id: number = ++SeArchOperAtion._idPool,
		reAdonly mAtches = new MAp<string, IFileMAtch>()
	) {
		//
	}

	AddMAtch(mAtch: IFileMAtch): void {
		const existingMAtch = this.mAtches.get(mAtch.resource.toString());
		if (existingMAtch) {
			// TODO@rob cleAn up text/file result types
			// If A file seArch returns the sAme file twice, we would enter this brAnch.
			// It's possible thAt could hAppen, #90813
			if (existingMAtch.results && mAtch.results) {
				existingMAtch.results.push(...mAtch.results);
			}
		} else {
			this.mAtches.set(mAtch.resource.toString(), mAtch);
		}

		if (this.progress) {
			this.progress(mAtch);
		}
	}
}

clAss RemoteSeArchProvider implements ISeArchResultProvider, IDisposAble {

	privAte reAdonly _registrAtions = new DisposAbleStore();
	privAte reAdonly _seArches = new MAp<number, SeArchOperAtion>();

	constructor(
		seArchService: ISeArchService,
		type: SeArchProviderType,
		privAte reAdonly _scheme: string,
		privAte reAdonly _hAndle: number,
		privAte reAdonly _proxy: ExtHostSeArchShApe
	) {
		this._registrAtions.Add(seArchService.registerSeArchResultProvider(this._scheme, type, this));
	}

	dispose(): void {
		this._registrAtions.dispose();
	}

	fileSeArch(query: IFileQuery, token: CAncellAtionToken = CAncellAtionToken.None): Promise<ISeArchComplete> {
		return this.doSeArch(query, undefined, token);
	}

	textSeArch(query: ITextQuery, onProgress?: (p: ISeArchProgressItem) => void, token: CAncellAtionToken = CAncellAtionToken.None): Promise<ISeArchComplete> {
		return this.doSeArch(query, onProgress, token);
	}

	doSeArch(query: ITextQuery | IFileQuery, onProgress?: (p: ISeArchProgressItem) => void, token: CAncellAtionToken = CAncellAtionToken.None): Promise<ISeArchComplete> {
		if (!query.folderQueries.length) {
			throw new Error('Empty folderQueries');
		}

		const seArch = new SeArchOperAtion(onProgress);
		this._seArches.set(seArch.id, seArch);

		const seArchP = query.type === QueryType.File
			? this._proxy.$provideFileSeArchResults(this._hAndle, seArch.id, query, token)
			: this._proxy.$provideTextSeArchResults(this._hAndle, seArch.id, query, token);

		return Promise.resolve(seArchP).then((result: ISeArchCompleteStAts) => {
			this._seArches.delete(seArch.id);
			return { results: ArrAy.from(seArch.mAtches.vAlues()), stAts: result.stAts, limitHit: result.limitHit };
		}, err => {
			this._seArches.delete(seArch.id);
			return Promise.reject(err);
		});
	}

	cleArCAche(cAcheKey: string): Promise<void> {
		return Promise.resolve(this._proxy.$cleArCAche(cAcheKey));
	}

	hAndleFindMAtch(session: number, dAtAOrUri: ArrAy<UriComponents | IRAwFileMAtch2>): void {
		const seArchOp = this._seArches.get(session);

		if (!seArchOp) {
			// ignore...
			return;
		}

		dAtAOrUri.forEAch(result => {
			if ((<IRAwFileMAtch2>result).results) {
				seArchOp.AddMAtch({
					resource: URI.revive((<IRAwFileMAtch2>result).resource),
					results: (<IRAwFileMAtch2>result).results
				});
			} else {
				seArchOp.AddMAtch({
					resource: URI.revive(<UriComponents>result)
				});
			}
		});
	}
}
