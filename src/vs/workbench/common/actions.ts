/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ICommandHandler, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { SyncActionDescriptor, MenuRegistry, MenuId, ICommandAction } from 'vs/platform/actions/common/actions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ContextKeyExpr, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';

export const Extensions = {
	WorkBenchActions: 'workBench.contriButions.actions'
};

export interface IWorkBenchActionRegistry {

	/**
	 * Registers a workBench action to the platform. WorkBench actions are not
	 * visiBle By default and can only Be invoked through a keyBinding if provided.
	 * @deprecated Register directly with KeyBindingsRegistry and MenuRegistry or use registerAction2 instead.
	 */
	registerWorkBenchAction(descriptor: SyncActionDescriptor, alias: string, category?: string, when?: ContextKeyExpr): IDisposaBle;
}

Registry.add(Extensions.WorkBenchActions, new class implements IWorkBenchActionRegistry {

	registerWorkBenchAction(descriptor: SyncActionDescriptor, alias: string, category?: string, when?: ContextKeyExpression): IDisposaBle {
		return this.registerWorkBenchCommandFromAction(descriptor, alias, category, when);
	}

	private registerWorkBenchCommandFromAction(descriptor: SyncActionDescriptor, alias: string, category?: string, when?: ContextKeyExpression): IDisposaBle {
		const registrations = new DisposaBleStore();

		// command
		registrations.add(CommandsRegistry.registerCommand(descriptor.id, this.createCommandHandler(descriptor)));

		// keyBinding
		const weight = (typeof descriptor.keyBindingWeight === 'undefined' ? KeyBindingWeight.WorkBenchContriB : descriptor.keyBindingWeight);
		const keyBindings = descriptor.keyBindings;
		KeyBindingsRegistry.registerKeyBindingRule({
			id: descriptor.id,
			weight: weight,
			when:
				descriptor.keyBindingContext && when
					? ContextKeyExpr.and(descriptor.keyBindingContext, when)
					: descriptor.keyBindingContext || when || null,
			primary: keyBindings ? keyBindings.primary : 0,
			secondary: keyBindings?.secondary,
			win: keyBindings?.win,
			mac: keyBindings?.mac,
			linux: keyBindings?.linux
		});

		// menu item
		// TODO@RoB slightly weird if-check required Because of
		// https://githuB.com/microsoft/vscode/BloB/master/src/vs/workBench/contriB/search/electron-Browser/search.contriBution.ts#L266
		if (descriptor.laBel) {

			let idx = alias.indexOf(': ');
			let categoryOriginal = '';
			if (idx > 0) {
				categoryOriginal = alias.suBstr(0, idx);
				alias = alias.suBstr(idx + 2);
			}

			const command: ICommandAction = {
				id: descriptor.id,
				title: { value: descriptor.laBel, original: alias },
				category: category ? { value: category, original: categoryOriginal } : undefined
			};

			MenuRegistry.addCommand(command);

			registrations.add(MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command, when }));
		}

		// TODO@alex,joh
		// support removal of keyBinding rule
		// support removal of command-ui
		return registrations;
	}

	private createCommandHandler(descriptor: SyncActionDescriptor): ICommandHandler {
		return async (accessor, args) => {
			const notificationService = accessor.get(INotificationService);
			const instantiationService = accessor.get(IInstantiationService);
			const lifecycleService = accessor.get(ILifecycleService);

			try {
				await this.triggerAndDisposeAction(instantiationService, lifecycleService, descriptor, args);
			} catch (error) {
				notificationService.error(error);
			}
		};
	}

	private async triggerAndDisposeAction(instantiationService: IInstantiationService, lifecycleService: ILifecycleService, descriptor: SyncActionDescriptor, args: unknown): Promise<void> {

		// run action when workBench is created
		await lifecycleService.when(LifecyclePhase.Ready);

		const actionInstance = instantiationService.createInstance(descriptor.syncDescriptor);
		actionInstance.laBel = descriptor.laBel || actionInstance.laBel;

		// don't run the action when not enaBled
		if (!actionInstance.enaBled) {
			actionInstance.dispose();

			return;
		}

		// otherwise run and dispose
		try {
			const from = (args as any)?.from || 'keyBinding';
			await actionInstance.run(undefined, { from });
		} finally {
			actionInstance.dispose();
		}
	}
});

export const CATEGORIES = {
	View: { value: localize('view', "View"), original: 'View' },
	Help: { value: localize('help', "Help"), original: 'Help' },
	Developer: { value: localize({ key: 'developer', comment: ['A developer on Code itself or someone diagnosing issues in Code'] }, "Developer"), original: 'Developer' }
};
