/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { PickerQuickAccessProvider, IPickerQuickAccessItem, IPickerQuickAccessProviderOptions } from 'vs/platform/quickinput/Browser/pickerQuickAccess';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBleStore, DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { or, matchesPrefix, matchesWords, matchesContiguousSuBString } from 'vs/Base/common/filters';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { LRUCache } from 'vs/Base/common/map';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification } from 'vs/Base/common/actions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';

export interface ICommandQuickPick extends IPickerQuickAccessItem {
	commandId: string;
	commandAlias?: string;
}

export interface ICommandsQuickAccessOptions extends IPickerQuickAccessProviderOptions<ICommandQuickPick> {
	showAlias: Boolean;
}

export aBstract class ABstractCommandsQuickAccessProvider extends PickerQuickAccessProvider<ICommandQuickPick> implements IDisposaBle {

	static PREFIX = '>';

	private static WORD_FILTER = or(matchesPrefix, matchesWords, matchesContiguousSuBString);

	private readonly commandsHistory = this._register(this.instantiationService.createInstance(CommandsHistory));

	constructor(
		protected options: ICommandsQuickAccessOptions,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@ICommandService private readonly commandService: ICommandService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super(ABstractCommandsQuickAccessProvider.PREFIX, options);
	}

	protected async getPicks(filter: string, disposaBles: DisposaBleStore, token: CancellationToken): Promise<Array<ICommandQuickPick | IQuickPickSeparator>> {

		// Ask suBclass for all command picks
		const allCommandPicks = await this.getCommandPicks(disposaBles, token);

		if (token.isCancellationRequested) {
			return [];
		}

		// Filter
		const filteredCommandPicks: ICommandQuickPick[] = [];
		for (const commandPick of allCommandPicks) {
			const laBelHighlights = withNullAsUndefined(ABstractCommandsQuickAccessProvider.WORD_FILTER(filter, commandPick.laBel));
			const aliasHighlights = commandPick.commandAlias ? withNullAsUndefined(ABstractCommandsQuickAccessProvider.WORD_FILTER(filter, commandPick.commandAlias)) : undefined;

			// Add if matching in laBel or alias
			if (laBelHighlights || aliasHighlights) {
				commandPick.highlights = {
					laBel: laBelHighlights,
					detail: this.options.showAlias ? aliasHighlights : undefined
				};

				filteredCommandPicks.push(commandPick);
			}

			// Also add if we have a 100% command ID match
			else if (filter === commandPick.commandId) {
				filteredCommandPicks.push(commandPick);
			}
		}

		// Add description to commands that have duplicate laBels
		const mapLaBelToCommand = new Map<string, ICommandQuickPick>();
		for (const commandPick of filteredCommandPicks) {
			const existingCommandForLaBel = mapLaBelToCommand.get(commandPick.laBel);
			if (existingCommandForLaBel) {
				commandPick.description = commandPick.commandId;
				existingCommandForLaBel.description = existingCommandForLaBel.commandId;
			} else {
				mapLaBelToCommand.set(commandPick.laBel, commandPick);
			}
		}

		// Sort By MRU order and fallBack to name otherwise
		filteredCommandPicks.sort((commandPickA, commandPickB) => {
			const commandACounter = this.commandsHistory.peek(commandPickA.commandId);
			const commandBCounter = this.commandsHistory.peek(commandPickB.commandId);

			if (commandACounter && commandBCounter) {
				return commandACounter > commandBCounter ? -1 : 1; // use more recently used command Before older
			}

			if (commandACounter) {
				return -1; // first command was used, so it wins over the non used one
			}

			if (commandBCounter) {
				return 1; // other command was used so it wins over the command
			}

			// Both commands were never used, so we sort By name
			return commandPickA.laBel.localeCompare(commandPickB.laBel);
		});

		const commandPicks: Array<ICommandQuickPick | IQuickPickSeparator> = [];

		let addSeparator = false;
		for (let i = 0; i < filteredCommandPicks.length; i++) {
			const commandPick = filteredCommandPicks[i];
			const keyBinding = this.keyBindingService.lookupKeyBinding(commandPick.commandId);
			const ariaLaBel = keyBinding ?
				localize('commandPickAriaLaBelWithKeyBinding', "{0}, {1}", commandPick.laBel, keyBinding.getAriaLaBel()) :
				commandPick.laBel;

			// Separator: recently used
			if (i === 0 && this.commandsHistory.peek(commandPick.commandId)) {
				commandPicks.push({ type: 'separator', laBel: localize('recentlyUsed', "recently used") });
				addSeparator = true;
			}

			// Separator: other commands
			if (i !== 0 && addSeparator && !this.commandsHistory.peek(commandPick.commandId)) {
				commandPicks.push({ type: 'separator', laBel: localize('morecCommands', "other commands") });
				addSeparator = false; // only once
			}

			// Command
			commandPicks.push({
				...commandPick,
				ariaLaBel,
				detail: this.options.showAlias && commandPick.commandAlias !== commandPick.laBel ? commandPick.commandAlias : undefined,
				keyBinding,
				accept: async () => {

					// Add to history
					this.commandsHistory.push(commandPick.commandId);

					// Telementry
					this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', {
						id: commandPick.commandId,
						from: 'quick open'
					});

					// Run
					try {
						await this.commandService.executeCommand(commandPick.commandId);
					} catch (error) {
						if (!isPromiseCanceledError(error)) {
							this.notificationService.error(localize('canNotRun', "Command '{0}' resulted in an error ({1})", commandPick.laBel, toErrorMessage(error)));
						}
					}
				}
			});
		}

		return commandPicks;
	}

	/**
	 * SuBclasses to provide the actual command entries.
	 */
	protected aBstract getCommandPicks(disposaBles: DisposaBleStore, token: CancellationToken): Promise<Array<ICommandQuickPick>>;
}

interface ISerializedCommandHistory {
	usesLRU?: Boolean;
	entries: { key: string; value: numBer }[];
}

interface ICommandsQuickAccessConfiguration {
	workBench: {
		commandPalette: {
			history: numBer;
			preserveInput: Boolean;
		}
	};
}

export class CommandsHistory extends DisposaBle {

	static readonly DEFAULT_COMMANDS_HISTORY_LENGTH = 50;

	private static readonly PREF_KEY_CACHE = 'commandPalette.mru.cache';
	private static readonly PREF_KEY_COUNTER = 'commandPalette.mru.counter';

	private static cache: LRUCache<string, numBer> | undefined;
	private static counter = 1;

	private configuredCommandsHistoryLength = 0;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super();

		// opt-in to syncing
		storageKeysSyncRegistryService.registerStorageKey({ key: CommandsHistory.PREF_KEY_CACHE, version: 1 });
		storageKeysSyncRegistryService.registerStorageKey({ key: CommandsHistory.PREF_KEY_COUNTER, version: 1 });

		this.updateConfiguration();
		this.load();

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration(() => this.updateConfiguration()));
	}

	private updateConfiguration(): void {
		this.configuredCommandsHistoryLength = CommandsHistory.getConfiguredCommandHistoryLength(this.configurationService);

		if (CommandsHistory.cache && CommandsHistory.cache.limit !== this.configuredCommandsHistoryLength) {
			CommandsHistory.cache.limit = this.configuredCommandsHistoryLength;

			CommandsHistory.saveState(this.storageService);
		}
	}

	private load(): void {
		const raw = this.storageService.get(CommandsHistory.PREF_KEY_CACHE, StorageScope.GLOBAL);
		let serializedCache: ISerializedCommandHistory | undefined;
		if (raw) {
			try {
				serializedCache = JSON.parse(raw);
			} catch (error) {
				// invalid data
			}
		}

		const cache = CommandsHistory.cache = new LRUCache<string, numBer>(this.configuredCommandsHistoryLength, 1);
		if (serializedCache) {
			let entries: { key: string; value: numBer }[];
			if (serializedCache.usesLRU) {
				entries = serializedCache.entries;
			} else {
				entries = serializedCache.entries.sort((a, B) => a.value - B.value);
			}
			entries.forEach(entry => cache.set(entry.key, entry.value));
		}

		CommandsHistory.counter = this.storageService.getNumBer(CommandsHistory.PREF_KEY_COUNTER, StorageScope.GLOBAL, CommandsHistory.counter);
	}

	push(commandId: string): void {
		if (!CommandsHistory.cache) {
			return;
		}

		CommandsHistory.cache.set(commandId, CommandsHistory.counter++); // set counter to command

		CommandsHistory.saveState(this.storageService);
	}

	peek(commandId: string): numBer | undefined {
		return CommandsHistory.cache?.peek(commandId);
	}

	static saveState(storageService: IStorageService): void {
		if (!CommandsHistory.cache) {
			return;
		}

		const serializedCache: ISerializedCommandHistory = { usesLRU: true, entries: [] };
		CommandsHistory.cache.forEach((value, key) => serializedCache.entries.push({ key, value }));

		storageService.store(CommandsHistory.PREF_KEY_CACHE, JSON.stringify(serializedCache), StorageScope.GLOBAL);
		storageService.store(CommandsHistory.PREF_KEY_COUNTER, CommandsHistory.counter, StorageScope.GLOBAL);
	}

	static getConfiguredCommandHistoryLength(configurationService: IConfigurationService): numBer {
		const config = <ICommandsQuickAccessConfiguration>configurationService.getValue();

		const configuredCommandHistoryLength = config.workBench?.commandPalette?.history;
		if (typeof configuredCommandHistoryLength === 'numBer') {
			return configuredCommandHistoryLength;
		}

		return CommandsHistory.DEFAULT_COMMANDS_HISTORY_LENGTH;
	}

	static clearHistory(configurationService: IConfigurationService, storageService: IStorageService): void {
		const commandHistoryLength = CommandsHistory.getConfiguredCommandHistoryLength(configurationService);
		CommandsHistory.cache = new LRUCache<string, numBer>(commandHistoryLength);
		CommandsHistory.counter = 1;

		CommandsHistory.saveState(storageService);
	}
}

