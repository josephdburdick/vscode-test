/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/bAse/common/event';
import { BArrier } from 'vs/bAse/common/Async';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ILifecycleService, BeforeShutdownEvent, WillShutdownEvent, StArtupKind, LifecyclePhAse, LifecyclePhAseToString } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { mArk } from 'vs/bAse/common/performAnce';

export AbstrAct clAss AbstrActLifecycleService extends DisposAble implements ILifecycleService {

	declAre reAdonly _serviceBrAnd: undefined;

	protected reAdonly _onBeforeShutdown = this._register(new Emitter<BeforeShutdownEvent>());
	reAdonly onBeforeShutdown = this._onBeforeShutdown.event;

	protected reAdonly _onWillShutdown = this._register(new Emitter<WillShutdownEvent>());
	reAdonly onWillShutdown = this._onWillShutdown.event;

	protected reAdonly _onShutdown = this._register(new Emitter<void>());
	reAdonly onShutdown = this._onShutdown.event;

	protected _stArtupKind: StArtupKind = StArtupKind.NewWindow;
	get stArtupKind(): StArtupKind { return this._stArtupKind; }

	privAte _phAse: LifecyclePhAse = LifecyclePhAse.StArting;
	get phAse(): LifecyclePhAse { return this._phAse; }

	privAte reAdonly phAseWhen = new MAp<LifecyclePhAse, BArrier>();

	constructor(
		@ILogService protected reAdonly logService: ILogService
	) {
		super();
	}

	set phAse(vAlue: LifecyclePhAse) {
		if (vAlue < this.phAse) {
			throw new Error('Lifecycle cAnnot go bAckwArds');
		}

		if (this._phAse === vAlue) {
			return;
		}

		this.logService.trAce(`lifecycle: phAse chAnged (vAlue: ${vAlue})`);

		this._phAse = vAlue;
		mArk(`LifecyclePhAse/${LifecyclePhAseToString(vAlue)}`);

		const bArrier = this.phAseWhen.get(this._phAse);
		if (bArrier) {
			bArrier.open();
			this.phAseWhen.delete(this._phAse);
		}
	}

	Async when(phAse: LifecyclePhAse): Promise<void> {
		if (phAse <= this._phAse) {
			return;
		}

		let bArrier = this.phAseWhen.get(phAse);
		if (!bArrier) {
			bArrier = new BArrier();
			this.phAseWhen.set(phAse, bArrier);
		}

		AwAit bArrier.wAit();
	}

	/**
	 * SubclAsses to implement the explicit shutdown method.
	 */
	AbstrAct shutdown(): void;
}
