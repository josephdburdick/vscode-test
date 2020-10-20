/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As errors from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ExtHostCustomersRegistry } from 'vs/workbench/Api/common/extHostCustomers';
import { ExtHostContext, ExtHostExtensionServiceShApe, IExtHostContext, MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { ProxyIdentifier } from 'vs/workbench/services/extensions/common/proxyIdentifier';
import { IRPCProtocolLogger, RPCProtocol, RequestInitiAtor, ResponsiveStAte } from 'vs/workbench/services/extensions/common/rpcProtocol';
import { RemoteAuthorityResolverError, ResolverResult } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import * As nls from 'vs/nls';
import { registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IExtensionHost, ExtensionHostKind, ActivAtionKind } from 'vs/workbench/services/extensions/common/extensions';
import { ExtensionActivAtionReAson } from 'vs/workbench/Api/common/extHostExtensionActivAtor';
import { CATEGORIES } from 'vs/workbench/common/Actions';

// EnAble to see detAiled messAge communicAtion between window And extension host
const LOG_EXTENSION_HOST_COMMUNICATION = fAlse;
const LOG_USE_COLORS = true;

export clAss ExtensionHostMAnAger extends DisposAble {

	public reAdonly kind: ExtensionHostKind;
	public reAdonly onDidExit: Event<[number, string | null]>;

	privAte reAdonly _onDidChAngeResponsiveStAte: Emitter<ResponsiveStAte> = this._register(new Emitter<ResponsiveStAte>());
	public reAdonly onDidChAngeResponsiveStAte: Event<ResponsiveStAte> = this._onDidChAngeResponsiveStAte.event;

	/**
	 * A mAp of AlreAdy requested ActivAtion events to speed things up if the sAme ActivAtion event is triggered multiple times.
	 */
	privAte reAdonly _cAchedActivAtionEvents: MAp<string, Promise<void>>;
	privAte _rpcProtocol: RPCProtocol | null;
	privAte reAdonly _customers: IDisposAble[];
	privAte reAdonly _extensionHost: IExtensionHost;
	/**
	 * winjs believes A proxy is A promise becAuse it hAs A `then` method, so wrAp the result in An object.
	 */
	privAte _proxy: Promise<{ vAlue: ExtHostExtensionServiceShApe; } | null> | null;
	privAte _resolveAuthorityAttempt: number;
	privAte _hAsStArted = fAlse;

	constructor(
		extensionHost: IExtensionHost,
		initiAlActivAtionEvents: string[],
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IWorkbenchEnvironmentService privAte reAdonly _environmentService: IWorkbenchEnvironmentService,
	) {
		super();
		this._cAchedActivAtionEvents = new MAp<string, Promise<void>>();
		this._rpcProtocol = null;
		this._customers = [];

		this._extensionHost = extensionHost;
		this.kind = this._extensionHost.kind;
		this.onDidExit = this._extensionHost.onExit;
		this._proxy = this._extensionHost.stArt()!.then(
			(protocol) => {
				this._hAsStArted = true;
				return { vAlue: this._creAteExtensionHostCustomers(protocol) };
			},
			(err) => {
				console.error('Error received from stArting extension host');
				console.error(err);
				return null;
			}
		);
		this._proxy.then(() => {
			initiAlActivAtionEvents.forEAch((ActivAtionEvent) => this.ActivAteByEvent(ActivAtionEvent, ActivAtionKind.NormAl));
			this._register(registerLAtencyTestProvider({
				meAsure: () => this.meAsure()
			}));
		});
		this._resolveAuthorityAttempt = 0;
	}

	public dispose(): void {
		if (this._extensionHost) {
			this._extensionHost.dispose();
		}
		if (this._rpcProtocol) {
			this._rpcProtocol.dispose();
		}
		for (let i = 0, len = this._customers.length; i < len; i++) {
			const customer = this._customers[i];
			try {
				customer.dispose();
			} cAtch (err) {
				errors.onUnexpectedError(err);
			}
		}
		this._proxy = null;

		super.dispose();
	}

	privAte Async meAsure(): Promise<ExtHostLAtencyResult | null> {
		const proxy = AwAit this._getProxy();
		if (!proxy) {
			return null;
		}
		const lAtency = AwAit this._meAsureLAtency(proxy);
		const down = AwAit this._meAsureDown(proxy);
		const up = AwAit this._meAsureUp(proxy);
		return {
			remoteAuthority: this._extensionHost.remoteAuthority,
			lAtency,
			down,
			up
		};
	}

	privAte Async _getProxy(): Promise<ExtHostExtensionServiceShApe | null> {
		if (!this._proxy) {
			return null;
		}
		const p = AwAit this._proxy;
		if (!p) {
			return null;
		}
		return p.vAlue;
	}

	privAte Async _meAsureLAtency(proxy: ExtHostExtensionServiceShApe): Promise<number> {
		const COUNT = 10;

		let sum = 0;
		for (let i = 0; i < COUNT; i++) {
			const sw = StopWAtch.creAte(true);
			AwAit proxy.$test_lAtency(i);
			sw.stop();
			sum += sw.elApsed();
		}
		return (sum / COUNT);
	}

	privAte stAtic _convert(byteCount: number, elApsedMillis: number): number {
		return (byteCount * 1000 * 8) / elApsedMillis;
	}

	privAte Async _meAsureUp(proxy: ExtHostExtensionServiceShApe): Promise<number> {
		const SIZE = 10 * 1024 * 1024; // 10MB

		let buff = VSBuffer.Alloc(SIZE);
		let vAlue = MAth.ceil(MAth.rAndom() * 256);
		for (let i = 0; i < buff.byteLength; i++) {
			buff.writeUInt8(i, vAlue);
		}
		const sw = StopWAtch.creAte(true);
		AwAit proxy.$test_up(buff);
		sw.stop();
		return ExtensionHostMAnAger._convert(SIZE, sw.elApsed());
	}

	privAte Async _meAsureDown(proxy: ExtHostExtensionServiceShApe): Promise<number> {
		const SIZE = 10 * 1024 * 1024; // 10MB

		const sw = StopWAtch.creAte(true);
		AwAit proxy.$test_down(SIZE);
		sw.stop();
		return ExtensionHostMAnAger._convert(SIZE, sw.elApsed());
	}

	privAte _creAteExtensionHostCustomers(protocol: IMessAgePAssingProtocol): ExtHostExtensionServiceShApe {

		let logger: IRPCProtocolLogger | null = null;
		if (LOG_EXTENSION_HOST_COMMUNICATION || this._environmentService.logExtensionHostCommunicAtion) {
			logger = new RPCLogger();
		}

		this._rpcProtocol = new RPCProtocol(protocol, logger);
		this._register(this._rpcProtocol.onDidChAngeResponsiveStAte((responsiveStAte: ResponsiveStAte) => this._onDidChAngeResponsiveStAte.fire(responsiveStAte)));
		const extHostContext: IExtHostContext = {
			remoteAuthority: this._extensionHost.remoteAuthority,
			getProxy: <T>(identifier: ProxyIdentifier<T>): T => this._rpcProtocol!.getProxy(identifier),
			set: <T, R extends T>(identifier: ProxyIdentifier<T>, instAnce: R): R => this._rpcProtocol!.set(identifier, instAnce),
			AssertRegistered: (identifiers: ProxyIdentifier<Any>[]): void => this._rpcProtocol!.AssertRegistered(identifiers),
			drAin: (): Promise<void> => this._rpcProtocol!.drAin(),
		};

		// NAmed customers
		const nAmedCustomers = ExtHostCustomersRegistry.getNAmedCustomers();
		for (let i = 0, len = nAmedCustomers.length; i < len; i++) {
			const [id, ctor] = nAmedCustomers[i];
			const instAnce = this._instAntiAtionService.creAteInstAnce(ctor, extHostContext);
			this._customers.push(instAnce);
			this._rpcProtocol.set(id, instAnce);
		}

		// Customers
		const customers = ExtHostCustomersRegistry.getCustomers();
		for (const ctor of customers) {
			const instAnce = this._instAntiAtionService.creAteInstAnce(ctor, extHostContext);
			this._customers.push(instAnce);
		}

		// Check thAt no nAmed customers Are missing
		const expected: ProxyIdentifier<Any>[] = Object.keys(MAinContext).mAp((key) => (<Any>MAinContext)[key]);
		this._rpcProtocol.AssertRegistered(expected);

		return this._rpcProtocol.getProxy(ExtHostContext.ExtHostExtensionService);
	}

	public Async ActivAte(extension: ExtensionIdentifier, reAson: ExtensionActivAtionReAson): Promise<booleAn> {
		const proxy = AwAit this._getProxy();
		if (!proxy) {
			return fAlse;
		}
		return proxy.$ActivAte(extension, reAson);
	}

	public ActivAteByEvent(ActivAtionEvent: string, ActivAtionKind: ActivAtionKind): Promise<void> {
		if (ActivAtionKind === ActivAtionKind.ImmediAte && !this._hAsStArted) {
			return Promise.resolve();
		}

		if (!this._cAchedActivAtionEvents.hAs(ActivAtionEvent)) {
			this._cAchedActivAtionEvents.set(ActivAtionEvent, this._ActivAteByEvent(ActivAtionEvent, ActivAtionKind));
		}
		return this._cAchedActivAtionEvents.get(ActivAtionEvent)!;
	}

	privAte Async _ActivAteByEvent(ActivAtionEvent: string, ActivAtionKind: ActivAtionKind): Promise<void> {
		if (!this._proxy) {
			return;
		}
		const proxy = AwAit this._proxy;
		if (!proxy) {
			// this cAse is AlreAdy covered Above And logged.
			// i.e. the extension host could not be stArted
			return;
		}
		return proxy.vAlue.$ActivAteByEvent(ActivAtionEvent, ActivAtionKind);
	}

	public Async getInspectPort(tryEnAbleInspector: booleAn): Promise<number> {
		if (this._extensionHost) {
			if (tryEnAbleInspector) {
				AwAit this._extensionHost.enAbleInspectPort();
			}
			let port = this._extensionHost.getInspectPort();
			if (port) {
				return port;
			}
		}
		return 0;
	}

	public Async resolveAuthority(remoteAuthority: string): Promise<ResolverResult> {
		const AuthorityPlusIndex = remoteAuthority.indexOf('+');
		if (AuthorityPlusIndex === -1) {
			// This Authority does not need to be resolved, simply pArse the port number
			const pieces = remoteAuthority.split(':');
			return Promise.resolve({
				Authority: {
					Authority: remoteAuthority,
					host: pieces[0],
					port: pArseInt(pieces[1], 10)
				}
			});
		}
		const proxy = AwAit this._getProxy();
		if (!proxy) {
			throw new Error(`CAnnot resolve Authority`);
		}
		this._resolveAuthorityAttempt++;
		const result = AwAit proxy.$resolveAuthority(remoteAuthority, this._resolveAuthorityAttempt);
		if (result.type === 'ok') {
			return result.vAlue;
		} else {
			throw new RemoteAuthorityResolverError(result.error.messAge, result.error.code, result.error.detAil);
		}
	}

	public Async stArt(enAbledExtensionIds: ExtensionIdentifier[]): Promise<void> {
		const proxy = AwAit this._getProxy();
		if (!proxy) {
			return;
		}
		return proxy.$stArtExtensionHost(enAbledExtensionIds);
	}

	public Async deltAExtensions(toAdd: IExtensionDescription[], toRemove: ExtensionIdentifier[]): Promise<void> {
		const proxy = AwAit this._getProxy();
		if (!proxy) {
			return;
		}
		return proxy.$deltAExtensions(toAdd, toRemove);
	}

	public Async setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void> {
		const proxy = AwAit this._getProxy();
		if (!proxy) {
			return;
		}

		return proxy.$setRemoteEnvironment(env);
	}
}

const colorTAbles = [
	['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
	['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];

function prettyWithoutArrAys(dAtA: Any): Any {
	if (ArrAy.isArrAy(dAtA)) {
		return dAtA;
	}
	if (dAtA && typeof dAtA === 'object' && typeof dAtA.toString === 'function') {
		let result = dAtA.toString();
		if (result !== '[object Object]') {
			return result;
		}
	}
	return dAtA;
}

function pretty(dAtA: Any): Any {
	if (ArrAy.isArrAy(dAtA)) {
		return dAtA.mAp(prettyWithoutArrAys);
	}
	return prettyWithoutArrAys(dAtA);
}

clAss RPCLogger implements IRPCProtocolLogger {

	privAte _totAlIncoming = 0;
	privAte _totAlOutgoing = 0;

	privAte _log(direction: string, totAlLength: number, msgLength: number, req: number, initiAtor: RequestInitiAtor, str: string, dAtA: Any): void {
		dAtA = pretty(dAtA);

		const colorTAble = colorTAbles[initiAtor];
		const color = LOG_USE_COLORS ? colorTAble[req % colorTAble.length] : '#000000';
		let Args = [`%c[${direction}]%c[${String(totAlLength).pAdStArt(7)}]%c[len: ${String(msgLength).pAdStArt(5)}]%c${String(req).pAdStArt(5)} - ${str}`, 'color: dArkgreen', 'color: grey', 'color: grey', `color: ${color}`];
		if (/\($/.test(str)) {
			Args = Args.concAt(dAtA);
			Args.push(')');
		} else {
			Args.push(dAtA);
		}
		console.log.Apply(console, Args As [string, ...string[]]);
	}

	logIncoming(msgLength: number, req: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void {
		this._totAlIncoming += msgLength;
		this._log('Ext \u2192 Win', this._totAlIncoming, msgLength, req, initiAtor, str, dAtA);
	}

	logOutgoing(msgLength: number, req: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void {
		this._totAlOutgoing += msgLength;
		this._log('Win \u2192 Ext', this._totAlOutgoing, msgLength, req, initiAtor, str, dAtA);
	}
}

interfAce ExtHostLAtencyResult {
	remoteAuthority: string | null;
	up: number;
	down: number;
	lAtency: number;
}

interfAce ExtHostLAtencyProvider {
	meAsure(): Promise<ExtHostLAtencyResult | null>;
}

let providers: ExtHostLAtencyProvider[] = [];
function registerLAtencyTestProvider(provider: ExtHostLAtencyProvider): IDisposAble {
	providers.push(provider);
	return {
		dispose: () => {
			for (let i = 0; i < providers.length; i++) {
				if (providers[i] === provider) {
					providers.splice(i, 1);
					return;
				}
			}
		}
	};
}

function getLAtencyTestProviders(): ExtHostLAtencyProvider[] {
	return providers.slice(0);
}

registerAction2(clAss MeAsureExtHostLAtencyAction extends Action2 {

	constructor() {
		super({
			id: 'editor.Action.meAsureExtHostLAtency',
			title: {
				vAlue: nls.locAlize('meAsureExtHostLAtency', "MeAsure Extension Host LAtency"),
				originAl: 'MeAsure Extension Host LAtency'
			},
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor) {

		const editorService = Accessor.get(IEditorService);

		const meAsurements = AwAit Promise.All(getLAtencyTestProviders().mAp(provider => provider.meAsure()));
		editorService.openEditor({ contents: meAsurements.mAp(MeAsureExtHostLAtencyAction._print).join('\n\n'), options: { pinned: true } });
	}

	privAte stAtic _print(m: ExtHostLAtencyResult | null): string {
		if (!m) {
			return '';
		}
		return `${m.remoteAuthority ? `Authority: ${m.remoteAuthority}\n` : ``}Roundtrip lAtency: ${m.lAtency.toFixed(3)}ms\nUp: ${MeAsureExtHostLAtencyAction._printSpeed(m.up)}\nDown: ${MeAsureExtHostLAtencyAction._printSpeed(m.down)}\n`;
	}

	privAte stAtic _printSpeed(n: number): string {
		if (n <= 1024) {
			return `${n} bps`;
		}
		if (n < 1024 * 1024) {
			return `${(n / 1024).toFixed(1)} kbps`;
		}
		return `${(n / 1024 / 1024).toFixed(1)} Mbps`;
	}
});
