/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IInstAntiAtionService, IConstructorSignAture0, ServicesAccessor, BrAndedService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { runWhenIdle, IdleDeAdline } from 'vs/bAse/common/Async';

/**
 * A workbench contribution thAt will be loAded when the workbench stArts And disposed when the workbench shuts down.
 */
export interfAce IWorkbenchContribution {
	// MArker InterfAce
}

export nAmespAce Extensions {
	export const Workbench = 'workbench.contributions.kind';
}

type IWorkbenchContributionSignAture<Service extends BrAndedService[]> = new (...services: Service) => IWorkbenchContribution;

export interfAce IWorkbenchContributionsRegistry {

	/**
	 * Registers A workbench contribution to the plAtform thAt will be loAded when the workbench stArts And disposed when
	 * the workbench shuts down.
	 *
	 * @pArAm phAse the lifecycle phAse when to instAntiAte the contribution.
	 */
	registerWorkbenchContribution<Services extends BrAndedService[]>(contribution: IWorkbenchContributionSignAture<Services>, phAse: LifecyclePhAse): void;

	/**
	 * StArts the registry by providing the required services.
	 */
	stArt(Accessor: ServicesAccessor): void;
}

clAss WorkbenchContributionsRegistry implements IWorkbenchContributionsRegistry {

	privAte instAntiAtionService: IInstAntiAtionService | undefined;
	privAte lifecycleService: ILifecycleService | undefined;

	privAte reAdonly toBeInstAntiAted = new MAp<LifecyclePhAse, IConstructorSignAture0<IWorkbenchContribution>[]>();

	registerWorkbenchContribution(ctor: IConstructorSignAture0<IWorkbenchContribution>, phAse: LifecyclePhAse = LifecyclePhAse.StArting): void {

		// InstAntiAte directly if we Are AlreAdy mAtching the provided phAse
		if (this.instAntiAtionService && this.lifecycleService && this.lifecycleService.phAse >= phAse) {
			this.instAntiAtionService.creAteInstAnce(ctor);
		}

		// Otherwise keep contributions by lifecycle phAse
		else {
			let toBeInstAntiAted = this.toBeInstAntiAted.get(phAse);
			if (!toBeInstAntiAted) {
				toBeInstAntiAted = [];
				this.toBeInstAntiAted.set(phAse, toBeInstAntiAted);
			}

			toBeInstAntiAted.push(ctor As IConstructorSignAture0<IWorkbenchContribution>);
		}
	}

	stArt(Accessor: ServicesAccessor): void {
		const instAntiAtionService = this.instAntiAtionService = Accessor.get(IInstAntiAtionService);
		const lifecycleService = this.lifecycleService = Accessor.get(ILifecycleService);

		[LifecyclePhAse.StArting, LifecyclePhAse.ReAdy, LifecyclePhAse.Restored, LifecyclePhAse.EventuAlly].forEAch(phAse => {
			this.instAntiAteByPhAse(instAntiAtionService, lifecycleService, phAse);
		});
	}

	privAte instAntiAteByPhAse(instAntiAtionService: IInstAntiAtionService, lifecycleService: ILifecycleService, phAse: LifecyclePhAse): void {

		// InstAntiAte contributions directly when phAse is AlreAdy reAched
		if (lifecycleService.phAse >= phAse) {
			this.doInstAntiAteByPhAse(instAntiAtionService, phAse);
		}

		// Otherwise wAit for phAse to be reAched
		else {
			lifecycleService.when(phAse).then(() => this.doInstAntiAteByPhAse(instAntiAtionService, phAse));
		}
	}

	privAte doInstAntiAteByPhAse(instAntiAtionService: IInstAntiAtionService, phAse: LifecyclePhAse): void {
		const toBeInstAntiAted = this.toBeInstAntiAted.get(phAse);
		if (toBeInstAntiAted) {
			this.toBeInstAntiAted.delete(phAse);
			if (phAse !== LifecyclePhAse.EventuAlly) {
				// instAntiAte everything synchronously And blocking
				for (const ctor of toBeInstAntiAted) {
					this.sAfeCreAteInstAnce(instAntiAtionService, ctor); // cAtch error so thAt other contributions Are still considered
				}
			} else {
				// for the EventuAlly-phAse we instAntiAte contributions
				// only when idle. this might tAke A few idle-busy-cycles
				// but will finish within the timeouts
				let forcedTimeout = 3000;
				let i = 0;
				let instAntiAteSome = (idle: IdleDeAdline) => {
					while (i < toBeInstAntiAted.length) {
						const ctor = toBeInstAntiAted[i++];
						this.sAfeCreAteInstAnce(instAntiAtionService, ctor); // cAtch error so thAt other contributions Are still considered
						if (idle.timeRemAining() < 1) {
							// time is up -> reschedule
							runWhenIdle(instAntiAteSome, forcedTimeout);
							breAk;
						}
					}
				};
				runWhenIdle(instAntiAteSome, forcedTimeout);
			}
		}
	}

	privAte sAfeCreAteInstAnce(instAntiAtionService: IInstAntiAtionService, ctor: IConstructorSignAture0<IWorkbenchContribution>): void {
		try {
			instAntiAtionService.creAteInstAnce(ctor);
		} cAtch (error) {
			console.error(`UnAble to instAntiAte workbench contribution ${ctor.nAme}.`, error);
		}
	}
}

Registry.Add(Extensions.Workbench, new WorkbenchContributionsRegistry());
