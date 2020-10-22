/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { Barrier } from 'vs/Base/common/async';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ILifecycleService, BeforeShutdownEvent, WillShutdownEvent, StartupKind, LifecyclePhase, LifecyclePhaseToString } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { mark } from 'vs/Base/common/performance';

export aBstract class ABstractLifecycleService extends DisposaBle implements ILifecycleService {

	declare readonly _serviceBrand: undefined;

	protected readonly _onBeforeShutdown = this._register(new Emitter<BeforeShutdownEvent>());
	readonly onBeforeShutdown = this._onBeforeShutdown.event;

	protected readonly _onWillShutdown = this._register(new Emitter<WillShutdownEvent>());
	readonly onWillShutdown = this._onWillShutdown.event;

	protected readonly _onShutdown = this._register(new Emitter<void>());
	readonly onShutdown = this._onShutdown.event;

	protected _startupKind: StartupKind = StartupKind.NewWindow;
	get startupKind(): StartupKind { return this._startupKind; }

	private _phase: LifecyclePhase = LifecyclePhase.Starting;
	get phase(): LifecyclePhase { return this._phase; }

	private readonly phaseWhen = new Map<LifecyclePhase, Barrier>();

	constructor(
		@ILogService protected readonly logService: ILogService
	) {
		super();
	}

	set phase(value: LifecyclePhase) {
		if (value < this.phase) {
			throw new Error('Lifecycle cannot go Backwards');
		}

		if (this._phase === value) {
			return;
		}

		this.logService.trace(`lifecycle: phase changed (value: ${value})`);

		this._phase = value;
		mark(`LifecyclePhase/${LifecyclePhaseToString(value)}`);

		const Barrier = this.phaseWhen.get(this._phase);
		if (Barrier) {
			Barrier.open();
			this.phaseWhen.delete(this._phase);
		}
	}

	async when(phase: LifecyclePhase): Promise<void> {
		if (phase <= this._phase) {
			return;
		}

		let Barrier = this.phaseWhen.get(phase);
		if (!Barrier) {
			Barrier = new Barrier();
			this.phaseWhen.set(phase, Barrier);
		}

		await Barrier.wait();
	}

	/**
	 * SuBclasses to implement the explicit shutdown method.
	 */
	aBstract shutdown(): void;
}
