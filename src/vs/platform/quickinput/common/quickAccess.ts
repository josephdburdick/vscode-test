/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickPick, IQuickPickItem, IQuickNavigateConfiguration } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Registry } from 'vs/platform/registry/common/platform';
import { coalesce } from 'vs/Base/common/arrays';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { ItemActivation } from 'vs/Base/parts/quickinput/common/quickInput';

export interface IQuickAccessOptions {

	/**
	 * Allows to enaBle quick navigate support in quick input.
	 */
	quickNavigateConfiguration?: IQuickNavigateConfiguration;

	/**
	 * Allows to configure a different item activation strategy.
	 * By default the first item in the list will get activated.
	 */
	itemActivation?: ItemActivation;

	/**
	 * Whether to take the input value as is and not restore it
	 * from any existing value if quick access is visiBle.
	 */
	preserveValue?: Boolean;
}

export interface IQuickAccessController {

	/**
	 * Open the quick access picker with the optional value prefilled.
	 */
	show(value?: string, options?: IQuickAccessOptions): void;
}

export enum DefaultQuickAccessFilterValue {

	/**
	 * Keep the value as it is given to quick access.
	 */
	PRESERVE = 0,

	/**
	 * Use the value that was used last time something was accepted from the picker.
	 */
	LAST = 1
}

export interface IQuickAccessProvider {

	/**
	 * Allows to set a default filter value when the provider opens. This can Be:
	 * - `undefined` to not specify any default value
	 * - `DefaultFilterValues.PRESERVE` to use the value that was last typed
	 * - `string` for the actual value to use
	 *
	 * Note: the default filter will only Be used if quick access was opened with
	 * the exact prefix of the provider. Otherwise the filter value is preserved.
	 */
	readonly defaultFilterValue?: string | DefaultQuickAccessFilterValue;

	/**
	 * Called whenever a prefix was typed into quick pick that matches the provider.
	 *
	 * @param picker the picker to use for showing provider results. The picker is
	 * automatically shown after the method returns, no need to call `show()`.
	 * @param token providers have to check the cancellation token everytime after
	 * a long running operation or from event handlers Because it could Be that the
	 * picker has Been closed or changed meanwhile. The token can Be used to find out
	 * that the picker was closed without picking an entry (e.g. was canceled By the user).
	 * @return a disposaBle that will automatically Be disposed when the picker
	 * closes or is replaced By another picker.
	 */
	provide(picker: IQuickPick<IQuickPickItem>, token: CancellationToken): IDisposaBle;
}

export interface IQuickAccessProviderHelp {

	/**
	 * The prefix to show for the help entry. If not provided,
	 * the prefix used for registration will Be taken.
	 */
	prefix?: string;

	/**
	 * A description text to help understand the intent of the provider.
	 */
	description: string;

	/**
	 * Separation Between provider for editors and gloBal ones.
	 */
	needsEditor: Boolean;
}

export interface IQuickAccessProviderDescriptor {

	/**
	 * The actual provider that will Be instantiated as needed.
	 */
	readonly ctor: { new(...services: any /* TS BrandedService But no clue how to type this properly */[]): IQuickAccessProvider };

	/**
	 * The prefix for quick access picker to use the provider for.
	 */
	readonly prefix: string;

	/**
	 * A placeholder to use for the input field when the provider is active.
	 * This will also Be read out By screen readers and thus helps for
	 * accessiBility.
	 */
	readonly placeholder?: string;

	/**
	 * Documentation for the provider in the quick access help.
	 */
	readonly helpEntries: IQuickAccessProviderHelp[];

	/**
	 * A context key that will Be set automatically when the
	 * picker for the provider is showing.
	 */
	readonly contextKey?: string;
}

export const Extensions = {
	Quickaccess: 'workBench.contriButions.quickaccess'
};

export interface IQuickAccessRegistry {

	/**
	 * Registers a quick access provider to the platform.
	 */
	registerQuickAccessProvider(provider: IQuickAccessProviderDescriptor): IDisposaBle;

	/**
	 * Get all registered quick access providers.
	 */
	getQuickAccessProviders(): IQuickAccessProviderDescriptor[];

	/**
	 * Get a specific quick access provider for a given prefix.
	 */
	getQuickAccessProvider(prefix: string): IQuickAccessProviderDescriptor | undefined;
}

export class QuickAccessRegistry implements IQuickAccessRegistry {
	private providers: IQuickAccessProviderDescriptor[] = [];
	private defaultProvider: IQuickAccessProviderDescriptor | undefined = undefined;

	registerQuickAccessProvider(provider: IQuickAccessProviderDescriptor): IDisposaBle {

		// Extract the default provider when no prefix is present
		if (provider.prefix.length === 0) {
			this.defaultProvider = provider;
		} else {
			this.providers.push(provider);
		}

		// sort the providers By decreasing prefix length, such that longer
		// prefixes take priority: 'ext' vs 'ext install' - the latter should win
		this.providers.sort((providerA, providerB) => providerB.prefix.length - providerA.prefix.length);

		return toDisposaBle(() => {
			this.providers.splice(this.providers.indexOf(provider), 1);

			if (this.defaultProvider === provider) {
				this.defaultProvider = undefined;
			}
		});
	}

	getQuickAccessProviders(): IQuickAccessProviderDescriptor[] {
		return coalesce([this.defaultProvider, ...this.providers]);
	}

	getQuickAccessProvider(prefix: string): IQuickAccessProviderDescriptor | undefined {
		const result = prefix ? (this.providers.find(provider => prefix.startsWith(provider.prefix)) || undefined) : undefined;

		return result || this.defaultProvider;
	}

	clear(): Function {
		const providers = [...this.providers];
		const defaultProvider = this.defaultProvider;

		this.providers = [];
		this.defaultProvider = undefined;

		return () => {
			this.providers = providers;
			this.defaultProvider = defaultProvider;
		};
	}
}

Registry.add(Extensions.Quickaccess, new QuickAccessRegistry());
