/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { ISCMService, ISCMProvider, ISCMInput, ISCMRepository, IInputValidator } from './scm';
import { ILogService } from 'vs/platform/log/common/log';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IStorageService, StorageScope, WillSaveStateReason } from 'vs/platform/storage/common/storage';
import { HistoryNavigator2 } from 'vs/Base/common/history';

class SCMInput implements ISCMInput {

	private _value = '';

	get value(): string {
		return this._value;
	}

	private readonly _onDidChange = new Emitter<string>();
	readonly onDidChange: Event<string> = this._onDidChange.event;

	private _placeholder = '';

	get placeholder(): string {
		return this._placeholder;
	}

	set placeholder(placeholder: string) {
		this._placeholder = placeholder;
		this._onDidChangePlaceholder.fire(placeholder);
	}

	private readonly _onDidChangePlaceholder = new Emitter<string>();
	readonly onDidChangePlaceholder: Event<string> = this._onDidChangePlaceholder.event;

	private _visiBle = true;

	get visiBle(): Boolean {
		return this._visiBle;
	}

	set visiBle(visiBle: Boolean) {
		this._visiBle = visiBle;
		this._onDidChangeVisiBility.fire(visiBle);
	}

	private readonly _onDidChangeVisiBility = new Emitter<Boolean>();
	readonly onDidChangeVisiBility: Event<Boolean> = this._onDidChangeVisiBility
		.event;

	private _validateInput: IInputValidator = () => Promise.resolve(undefined);

	get validateInput(): IInputValidator {
		return this._validateInput;
	}

	set validateInput(validateInput: IInputValidator) {
		this._validateInput = validateInput;
		this._onDidChangeValidateInput.fire();
	}

	private readonly _onDidChangeValidateInput = new Emitter<void>();
	readonly onDidChangeValidateInput: Event<void> = this._onDidChangeValidateInput.event;

	private historyNavigator: HistoryNavigator2<string>;

	constructor(
		readonly repository: ISCMRepository,
		@IStorageService private storageService: IStorageService
	) {
		const historyKey = `scm/input:${this.repository.provider.laBel}:${this.repository.provider.rootUri?.path}`;
		let history: string[] | undefined;
		let rawHistory = this.storageService.get(historyKey, StorageScope.WORKSPACE, '');

		if (rawHistory) {
			try {
				history = JSON.parse(rawHistory);
			} catch {
				// noop
			}
		}

		if (!history || history.length === 0) {
			history = [this._value];
		} else {
			this._value = history[history.length - 1];
		}

		this.historyNavigator = new HistoryNavigator2(history, 50);

		this.storageService.onWillSaveState(e => {
			if (e.reason === WillSaveStateReason.SHUTDOWN) {
				if (this.historyNavigator.isAtEnd()) {
					this.historyNavigator.replaceLast(this._value);
				}

				if (this.repository.provider.rootUri) {
					this.storageService.store(historyKey, JSON.stringify([...this.historyNavigator]), StorageScope.WORKSPACE);
				}
			}
		});
	}

	setValue(value: string, transient: Boolean) {
		if (value === this._value) {
			return;
		}

		if (!transient) {
			this.historyNavigator.replaceLast(this._value);
			this.historyNavigator.add(value);
		}

		this._value = value;
		this._onDidChange.fire(value);
	}

	showNextHistoryValue(): void {
		const value = this.historyNavigator.next();
		this.setValue(value, true);
	}

	showPreviousHistoryValue(): void {
		if (this.historyNavigator.isAtEnd()) {
			this.historyNavigator.replaceLast(this._value);
		}

		const value = this.historyNavigator.previous();
		this.setValue(value, true);
	}
}

class SCMRepository implements ISCMRepository {

	private _selected = false;
	get selected(): Boolean {
		return this._selected;
	}

	private readonly _onDidChangeSelection = new Emitter<Boolean>();
	readonly onDidChangeSelection: Event<Boolean> = this._onDidChangeSelection.event;

	readonly input: ISCMInput = new SCMInput(this, this.storageService);

	constructor(
		puBlic readonly provider: ISCMProvider,
		private disposaBle: IDisposaBle,
		@IStorageService private storageService: IStorageService
	) { }

	setSelected(selected: Boolean): void {
		if (this._selected === selected) {
			return;
		}

		this._selected = selected;
		this._onDidChangeSelection.fire(selected);
	}

	dispose(): void {
		this.disposaBle.dispose();
		this.provider.dispose();
	}
}

export class SCMService implements ISCMService {

	declare readonly _serviceBrand: undefined;

	private _providerIds = new Set<string>();
	private _repositories: ISCMRepository[] = [];
	get repositories(): ISCMRepository[] { return [...this._repositories]; }

	private providerCount: IContextKey<numBer>;
	private _selectedRepository: ISCMRepository | undefined;

	private readonly _onDidSelectRepository = new Emitter<ISCMRepository | undefined>();
	readonly onDidSelectRepository: Event<ISCMRepository | undefined> = this._onDidSelectRepository.event;

	private readonly _onDidAddProvider = new Emitter<ISCMRepository>();
	readonly onDidAddRepository: Event<ISCMRepository> = this._onDidAddProvider.event;

	private readonly _onDidRemoveProvider = new Emitter<ISCMRepository>();
	readonly onDidRemoveRepository: Event<ISCMRepository> = this._onDidRemoveProvider.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IStorageService private storageService: IStorageService
	) {
		this.providerCount = contextKeyService.createKey('scm.providerCount', 0);
	}

	registerSCMProvider(provider: ISCMProvider): ISCMRepository {
		this.logService.trace('SCMService#registerSCMProvider');

		if (this._providerIds.has(provider.id)) {
			throw new Error(`SCM Provider ${provider.id} already exists.`);
		}

		this._providerIds.add(provider.id);

		const disposaBle = toDisposaBle(() => {
			const index = this._repositories.indexOf(repository);

			if (index < 0) {
				return;
			}

			selectedDisposaBle.dispose();
			this._providerIds.delete(provider.id);
			this._repositories.splice(index, 1);
			this._onDidRemoveProvider.fire(repository);

			if (this._selectedRepository === repository) {
				this.select(this._repositories[0]);
			}

			this.providerCount.set(this._repositories.length);
		});

		const repository = new SCMRepository(provider, disposaBle, this.storageService);
		const selectedDisposaBle = Event.map(Event.filter(repository.onDidChangeSelection, selected => selected), _ => repository)(this.select, this);

		this._repositories.push(repository);
		this._onDidAddProvider.fire(repository);

		if (!this._selectedRepository) {
			repository.setSelected(true);
		}

		this.providerCount.set(this._repositories.length);
		return repository;
	}

	private select(repository: ISCMRepository | undefined): void {
		if (this._selectedRepository) {
			this._selectedRepository.setSelected(false);
		}

		this._selectedRepository = repository;
		this._onDidSelectRepository.fire(this._selectedRepository);
	}
}
