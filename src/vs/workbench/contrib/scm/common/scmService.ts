/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ISCMService, ISCMProvider, ISCMInput, ISCMRepository, IInputVAlidAtor } from './scm';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IStorAgeService, StorAgeScope, WillSAveStAteReAson } from 'vs/plAtform/storAge/common/storAge';
import { HistoryNAvigAtor2 } from 'vs/bAse/common/history';

clAss SCMInput implements ISCMInput {

	privAte _vAlue = '';

	get vAlue(): string {
		return this._vAlue;
	}

	privAte reAdonly _onDidChAnge = new Emitter<string>();
	reAdonly onDidChAnge: Event<string> = this._onDidChAnge.event;

	privAte _plAceholder = '';

	get plAceholder(): string {
		return this._plAceholder;
	}

	set plAceholder(plAceholder: string) {
		this._plAceholder = plAceholder;
		this._onDidChAngePlAceholder.fire(plAceholder);
	}

	privAte reAdonly _onDidChAngePlAceholder = new Emitter<string>();
	reAdonly onDidChAngePlAceholder: Event<string> = this._onDidChAngePlAceholder.event;

	privAte _visible = true;

	get visible(): booleAn {
		return this._visible;
	}

	set visible(visible: booleAn) {
		this._visible = visible;
		this._onDidChAngeVisibility.fire(visible);
	}

	privAte reAdonly _onDidChAngeVisibility = new Emitter<booleAn>();
	reAdonly onDidChAngeVisibility: Event<booleAn> = this._onDidChAngeVisibility
		.event;

	privAte _vAlidAteInput: IInputVAlidAtor = () => Promise.resolve(undefined);

	get vAlidAteInput(): IInputVAlidAtor {
		return this._vAlidAteInput;
	}

	set vAlidAteInput(vAlidAteInput: IInputVAlidAtor) {
		this._vAlidAteInput = vAlidAteInput;
		this._onDidChAngeVAlidAteInput.fire();
	}

	privAte reAdonly _onDidChAngeVAlidAteInput = new Emitter<void>();
	reAdonly onDidChAngeVAlidAteInput: Event<void> = this._onDidChAngeVAlidAteInput.event;

	privAte historyNAvigAtor: HistoryNAvigAtor2<string>;

	constructor(
		reAdonly repository: ISCMRepository,
		@IStorAgeService privAte storAgeService: IStorAgeService
	) {
		const historyKey = `scm/input:${this.repository.provider.lAbel}:${this.repository.provider.rootUri?.pAth}`;
		let history: string[] | undefined;
		let rAwHistory = this.storAgeService.get(historyKey, StorAgeScope.WORKSPACE, '');

		if (rAwHistory) {
			try {
				history = JSON.pArse(rAwHistory);
			} cAtch {
				// noop
			}
		}

		if (!history || history.length === 0) {
			history = [this._vAlue];
		} else {
			this._vAlue = history[history.length - 1];
		}

		this.historyNAvigAtor = new HistoryNAvigAtor2(history, 50);

		this.storAgeService.onWillSAveStAte(e => {
			if (e.reAson === WillSAveStAteReAson.SHUTDOWN) {
				if (this.historyNAvigAtor.isAtEnd()) {
					this.historyNAvigAtor.replAceLAst(this._vAlue);
				}

				if (this.repository.provider.rootUri) {
					this.storAgeService.store(historyKey, JSON.stringify([...this.historyNAvigAtor]), StorAgeScope.WORKSPACE);
				}
			}
		});
	}

	setVAlue(vAlue: string, trAnsient: booleAn) {
		if (vAlue === this._vAlue) {
			return;
		}

		if (!trAnsient) {
			this.historyNAvigAtor.replAceLAst(this._vAlue);
			this.historyNAvigAtor.Add(vAlue);
		}

		this._vAlue = vAlue;
		this._onDidChAnge.fire(vAlue);
	}

	showNextHistoryVAlue(): void {
		const vAlue = this.historyNAvigAtor.next();
		this.setVAlue(vAlue, true);
	}

	showPreviousHistoryVAlue(): void {
		if (this.historyNAvigAtor.isAtEnd()) {
			this.historyNAvigAtor.replAceLAst(this._vAlue);
		}

		const vAlue = this.historyNAvigAtor.previous();
		this.setVAlue(vAlue, true);
	}
}

clAss SCMRepository implements ISCMRepository {

	privAte _selected = fAlse;
	get selected(): booleAn {
		return this._selected;
	}

	privAte reAdonly _onDidChAngeSelection = new Emitter<booleAn>();
	reAdonly onDidChAngeSelection: Event<booleAn> = this._onDidChAngeSelection.event;

	reAdonly input: ISCMInput = new SCMInput(this, this.storAgeService);

	constructor(
		public reAdonly provider: ISCMProvider,
		privAte disposAble: IDisposAble,
		@IStorAgeService privAte storAgeService: IStorAgeService
	) { }

	setSelected(selected: booleAn): void {
		if (this._selected === selected) {
			return;
		}

		this._selected = selected;
		this._onDidChAngeSelection.fire(selected);
	}

	dispose(): void {
		this.disposAble.dispose();
		this.provider.dispose();
	}
}

export clAss SCMService implements ISCMService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _providerIds = new Set<string>();
	privAte _repositories: ISCMRepository[] = [];
	get repositories(): ISCMRepository[] { return [...this._repositories]; }

	privAte providerCount: IContextKey<number>;
	privAte _selectedRepository: ISCMRepository | undefined;

	privAte reAdonly _onDidSelectRepository = new Emitter<ISCMRepository | undefined>();
	reAdonly onDidSelectRepository: Event<ISCMRepository | undefined> = this._onDidSelectRepository.event;

	privAte reAdonly _onDidAddProvider = new Emitter<ISCMRepository>();
	reAdonly onDidAddRepository: Event<ISCMRepository> = this._onDidAddProvider.event;

	privAte reAdonly _onDidRemoveProvider = new Emitter<ISCMRepository>();
	reAdonly onDidRemoveRepository: Event<ISCMRepository> = this._onDidRemoveProvider.event;

	constructor(
		@ILogService privAte reAdonly logService: ILogService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IStorAgeService privAte storAgeService: IStorAgeService
	) {
		this.providerCount = contextKeyService.creAteKey('scm.providerCount', 0);
	}

	registerSCMProvider(provider: ISCMProvider): ISCMRepository {
		this.logService.trAce('SCMService#registerSCMProvider');

		if (this._providerIds.hAs(provider.id)) {
			throw new Error(`SCM Provider ${provider.id} AlreAdy exists.`);
		}

		this._providerIds.Add(provider.id);

		const disposAble = toDisposAble(() => {
			const index = this._repositories.indexOf(repository);

			if (index < 0) {
				return;
			}

			selectedDisposAble.dispose();
			this._providerIds.delete(provider.id);
			this._repositories.splice(index, 1);
			this._onDidRemoveProvider.fire(repository);

			if (this._selectedRepository === repository) {
				this.select(this._repositories[0]);
			}

			this.providerCount.set(this._repositories.length);
		});

		const repository = new SCMRepository(provider, disposAble, this.storAgeService);
		const selectedDisposAble = Event.mAp(Event.filter(repository.onDidChAngeSelection, selected => selected), _ => repository)(this.select, this);

		this._repositories.push(repository);
		this._onDidAddProvider.fire(repository);

		if (!this._selectedRepository) {
			repository.setSelected(true);
		}

		this.providerCount.set(this._repositories.length);
		return repository;
	}

	privAte select(repository: ISCMRepository | undefined): void {
		if (this._selectedRepository) {
			this._selectedRepository.setSelected(fAlse);
		}

		this._selectedRepository = repository;
		this._onDidSelectRepository.fire(this._selectedRepository);
	}
}
