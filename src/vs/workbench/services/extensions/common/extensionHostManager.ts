/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as errors from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ExtHostCustomersRegistry } from 'vs/workBench/api/common/extHostCustomers';
import { ExtHostContext, ExtHostExtensionServiceShape, IExtHostContext, MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { ProxyIdentifier } from 'vs/workBench/services/extensions/common/proxyIdentifier';
import { IRPCProtocolLogger, RPCProtocol, RequestInitiator, ResponsiveState } from 'vs/workBench/services/extensions/common/rpcProtocol';
import { RemoteAuthorityResolverError, ResolverResult } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import * as nls from 'vs/nls';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { StopWatch } from 'vs/Base/common/stopwatch';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IExtensionHost, ExtensionHostKind, ActivationKind } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionActivationReason } from 'vs/workBench/api/common/extHostExtensionActivator';
import { CATEGORIES } from 'vs/workBench/common/actions';

// EnaBle to see detailed message communication Between window and extension host
const LOG_EXTENSION_HOST_COMMUNICATION = false;
const LOG_USE_COLORS = true;

export class ExtensionHostManager extends DisposaBle {

	puBlic readonly kind: ExtensionHostKind;
	puBlic readonly onDidExit: Event<[numBer, string | null]>;

	private readonly _onDidChangeResponsiveState: Emitter<ResponsiveState> = this._register(new Emitter<ResponsiveState>());
	puBlic readonly onDidChangeResponsiveState: Event<ResponsiveState> = this._onDidChangeResponsiveState.event;

	/**
	 * A map of already requested activation events to speed things up if the same activation event is triggered multiple times.
	 */
	private readonly _cachedActivationEvents: Map<string, Promise<void>>;
	private _rpcProtocol: RPCProtocol | null;
	private readonly _customers: IDisposaBle[];
	private readonly _extensionHost: IExtensionHost;
	/**
	 * winjs Believes a proxy is a promise Because it has a `then` method, so wrap the result in an oBject.
	 */
	private _proxy: Promise<{ value: ExtHostExtensionServiceShape; } | null> | null;
	private _resolveAuthorityAttempt: numBer;
	private _hasStarted = false;

	constructor(
		extensionHost: IExtensionHost,
		initialActivationEvents: string[],
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
	) {
		super();
		this._cachedActivationEvents = new Map<string, Promise<void>>();
		this._rpcProtocol = null;
		this._customers = [];

		this._extensionHost = extensionHost;
		this.kind = this._extensionHost.kind;
		this.onDidExit = this._extensionHost.onExit;
		this._proxy = this._extensionHost.start()!.then(
			(protocol) => {
				this._hasStarted = true;
				return { value: this._createExtensionHostCustomers(protocol) };
			},
			(err) => {
				console.error('Error received from starting extension host');
				console.error(err);
				return null;
			}
		);
		this._proxy.then(() => {
			initialActivationEvents.forEach((activationEvent) => this.activateByEvent(activationEvent, ActivationKind.Normal));
			this._register(registerLatencyTestProvider({
				measure: () => this.measure()
			}));
		});
		this._resolveAuthorityAttempt = 0;
	}

	puBlic dispose(): void {
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
			} catch (err) {
				errors.onUnexpectedError(err);
			}
		}
		this._proxy = null;

		super.dispose();
	}

	private async measure(): Promise<ExtHostLatencyResult | null> {
		const proxy = await this._getProxy();
		if (!proxy) {
			return null;
		}
		const latency = await this._measureLatency(proxy);
		const down = await this._measureDown(proxy);
		const up = await this._measureUp(proxy);
		return {
			remoteAuthority: this._extensionHost.remoteAuthority,
			latency,
			down,
			up
		};
	}

	private async _getProxy(): Promise<ExtHostExtensionServiceShape | null> {
		if (!this._proxy) {
			return null;
		}
		const p = await this._proxy;
		if (!p) {
			return null;
		}
		return p.value;
	}

	private async _measureLatency(proxy: ExtHostExtensionServiceShape): Promise<numBer> {
		const COUNT = 10;

		let sum = 0;
		for (let i = 0; i < COUNT; i++) {
			const sw = StopWatch.create(true);
			await proxy.$test_latency(i);
			sw.stop();
			sum += sw.elapsed();
		}
		return (sum / COUNT);
	}

	private static _convert(ByteCount: numBer, elapsedMillis: numBer): numBer {
		return (ByteCount * 1000 * 8) / elapsedMillis;
	}

	private async _measureUp(proxy: ExtHostExtensionServiceShape): Promise<numBer> {
		const SIZE = 10 * 1024 * 1024; // 10MB

		let Buff = VSBuffer.alloc(SIZE);
		let value = Math.ceil(Math.random() * 256);
		for (let i = 0; i < Buff.ByteLength; i++) {
			Buff.writeUInt8(i, value);
		}
		const sw = StopWatch.create(true);
		await proxy.$test_up(Buff);
		sw.stop();
		return ExtensionHostManager._convert(SIZE, sw.elapsed());
	}

	private async _measureDown(proxy: ExtHostExtensionServiceShape): Promise<numBer> {
		const SIZE = 10 * 1024 * 1024; // 10MB

		const sw = StopWatch.create(true);
		await proxy.$test_down(SIZE);
		sw.stop();
		return ExtensionHostManager._convert(SIZE, sw.elapsed());
	}

	private _createExtensionHostCustomers(protocol: IMessagePassingProtocol): ExtHostExtensionServiceShape {

		let logger: IRPCProtocolLogger | null = null;
		if (LOG_EXTENSION_HOST_COMMUNICATION || this._environmentService.logExtensionHostCommunication) {
			logger = new RPCLogger();
		}

		this._rpcProtocol = new RPCProtocol(protocol, logger);
		this._register(this._rpcProtocol.onDidChangeResponsiveState((responsiveState: ResponsiveState) => this._onDidChangeResponsiveState.fire(responsiveState)));
		const extHostContext: IExtHostContext = {
			remoteAuthority: this._extensionHost.remoteAuthority,
			getProxy: <T>(identifier: ProxyIdentifier<T>): T => this._rpcProtocol!.getProxy(identifier),
			set: <T, R extends T>(identifier: ProxyIdentifier<T>, instance: R): R => this._rpcProtocol!.set(identifier, instance),
			assertRegistered: (identifiers: ProxyIdentifier<any>[]): void => this._rpcProtocol!.assertRegistered(identifiers),
			drain: (): Promise<void> => this._rpcProtocol!.drain(),
		};

		// Named customers
		const namedCustomers = ExtHostCustomersRegistry.getNamedCustomers();
		for (let i = 0, len = namedCustomers.length; i < len; i++) {
			const [id, ctor] = namedCustomers[i];
			const instance = this._instantiationService.createInstance(ctor, extHostContext);
			this._customers.push(instance);
			this._rpcProtocol.set(id, instance);
		}

		// Customers
		const customers = ExtHostCustomersRegistry.getCustomers();
		for (const ctor of customers) {
			const instance = this._instantiationService.createInstance(ctor, extHostContext);
			this._customers.push(instance);
		}

		// Check that no named customers are missing
		const expected: ProxyIdentifier<any>[] = OBject.keys(MainContext).map((key) => (<any>MainContext)[key]);
		this._rpcProtocol.assertRegistered(expected);

		return this._rpcProtocol.getProxy(ExtHostContext.ExtHostExtensionService);
	}

	puBlic async activate(extension: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<Boolean> {
		const proxy = await this._getProxy();
		if (!proxy) {
			return false;
		}
		return proxy.$activate(extension, reason);
	}

	puBlic activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		if (activationKind === ActivationKind.Immediate && !this._hasStarted) {
			return Promise.resolve();
		}

		if (!this._cachedActivationEvents.has(activationEvent)) {
			this._cachedActivationEvents.set(activationEvent, this._activateByEvent(activationEvent, activationKind));
		}
		return this._cachedActivationEvents.get(activationEvent)!;
	}

	private async _activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void> {
		if (!this._proxy) {
			return;
		}
		const proxy = await this._proxy;
		if (!proxy) {
			// this case is already covered aBove and logged.
			// i.e. the extension host could not Be started
			return;
		}
		return proxy.value.$activateByEvent(activationEvent, activationKind);
	}

	puBlic async getInspectPort(tryEnaBleInspector: Boolean): Promise<numBer> {
		if (this._extensionHost) {
			if (tryEnaBleInspector) {
				await this._extensionHost.enaBleInspectPort();
			}
			let port = this._extensionHost.getInspectPort();
			if (port) {
				return port;
			}
		}
		return 0;
	}

	puBlic async resolveAuthority(remoteAuthority: string): Promise<ResolverResult> {
		const authorityPlusIndex = remoteAuthority.indexOf('+');
		if (authorityPlusIndex === -1) {
			// This authority does not need to Be resolved, simply parse the port numBer
			const pieces = remoteAuthority.split(':');
			return Promise.resolve({
				authority: {
					authority: remoteAuthority,
					host: pieces[0],
					port: parseInt(pieces[1], 10)
				}
			});
		}
		const proxy = await this._getProxy();
		if (!proxy) {
			throw new Error(`Cannot resolve authority`);
		}
		this._resolveAuthorityAttempt++;
		const result = await proxy.$resolveAuthority(remoteAuthority, this._resolveAuthorityAttempt);
		if (result.type === 'ok') {
			return result.value;
		} else {
			throw new RemoteAuthorityResolverError(result.error.message, result.error.code, result.error.detail);
		}
	}

	puBlic async start(enaBledExtensionIds: ExtensionIdentifier[]): Promise<void> {
		const proxy = await this._getProxy();
		if (!proxy) {
			return;
		}
		return proxy.$startExtensionHost(enaBledExtensionIds);
	}

	puBlic async deltaExtensions(toAdd: IExtensionDescription[], toRemove: ExtensionIdentifier[]): Promise<void> {
		const proxy = await this._getProxy();
		if (!proxy) {
			return;
		}
		return proxy.$deltaExtensions(toAdd, toRemove);
	}

	puBlic async setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void> {
		const proxy = await this._getProxy();
		if (!proxy) {
			return;
		}

		return proxy.$setRemoteEnvironment(env);
	}
}

const colorTaBles = [
	['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
	['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];

function prettyWithoutArrays(data: any): any {
	if (Array.isArray(data)) {
		return data;
	}
	if (data && typeof data === 'oBject' && typeof data.toString === 'function') {
		let result = data.toString();
		if (result !== '[oBject OBject]') {
			return result;
		}
	}
	return data;
}

function pretty(data: any): any {
	if (Array.isArray(data)) {
		return data.map(prettyWithoutArrays);
	}
	return prettyWithoutArrays(data);
}

class RPCLogger implements IRPCProtocolLogger {

	private _totalIncoming = 0;
	private _totalOutgoing = 0;

	private _log(direction: string, totalLength: numBer, msgLength: numBer, req: numBer, initiator: RequestInitiator, str: string, data: any): void {
		data = pretty(data);

		const colorTaBle = colorTaBles[initiator];
		const color = LOG_USE_COLORS ? colorTaBle[req % colorTaBle.length] : '#000000';
		let args = [`%c[${direction}]%c[${String(totalLength).padStart(7)}]%c[len: ${String(msgLength).padStart(5)}]%c${String(req).padStart(5)} - ${str}`, 'color: darkgreen', 'color: grey', 'color: grey', `color: ${color}`];
		if (/\($/.test(str)) {
			args = args.concat(data);
			args.push(')');
		} else {
			args.push(data);
		}
		console.log.apply(console, args as [string, ...string[]]);
	}

	logIncoming(msgLength: numBer, req: numBer, initiator: RequestInitiator, str: string, data?: any): void {
		this._totalIncoming += msgLength;
		this._log('Ext \u2192 Win', this._totalIncoming, msgLength, req, initiator, str, data);
	}

	logOutgoing(msgLength: numBer, req: numBer, initiator: RequestInitiator, str: string, data?: any): void {
		this._totalOutgoing += msgLength;
		this._log('Win \u2192 Ext', this._totalOutgoing, msgLength, req, initiator, str, data);
	}
}

interface ExtHostLatencyResult {
	remoteAuthority: string | null;
	up: numBer;
	down: numBer;
	latency: numBer;
}

interface ExtHostLatencyProvider {
	measure(): Promise<ExtHostLatencyResult | null>;
}

let providers: ExtHostLatencyProvider[] = [];
function registerLatencyTestProvider(provider: ExtHostLatencyProvider): IDisposaBle {
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

function getLatencyTestProviders(): ExtHostLatencyProvider[] {
	return providers.slice(0);
}

registerAction2(class MeasureExtHostLatencyAction extends Action2 {

	constructor() {
		super({
			id: 'editor.action.measureExtHostLatency',
			title: {
				value: nls.localize('measureExtHostLatency', "Measure Extension Host Latency"),
				original: 'Measure Extension Host Latency'
			},
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	async run(accessor: ServicesAccessor) {

		const editorService = accessor.get(IEditorService);

		const measurements = await Promise.all(getLatencyTestProviders().map(provider => provider.measure()));
		editorService.openEditor({ contents: measurements.map(MeasureExtHostLatencyAction._print).join('\n\n'), options: { pinned: true } });
	}

	private static _print(m: ExtHostLatencyResult | null): string {
		if (!m) {
			return '';
		}
		return `${m.remoteAuthority ? `Authority: ${m.remoteAuthority}\n` : ``}Roundtrip latency: ${m.latency.toFixed(3)}ms\nUp: ${MeasureExtHostLatencyAction._printSpeed(m.up)}\nDown: ${MeasureExtHostLatencyAction._printSpeed(m.down)}\n`;
	}

	private static _printSpeed(n: numBer): string {
		if (n <= 1024) {
			return `${n} Bps`;
		}
		if (n < 1024 * 1024) {
			return `${(n / 1024).toFixed(1)} kBps`;
		}
		return `${(n / 1024 / 1024).toFixed(1)} MBps`;
	}
});
