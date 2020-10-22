/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IInstantiationService, IConstructorSignature0, ServicesAccessor, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { runWhenIdle, IdleDeadline } from 'vs/Base/common/async';

/**
 * A workBench contriBution that will Be loaded when the workBench starts and disposed when the workBench shuts down.
 */
export interface IWorkBenchContriBution {
	// Marker Interface
}

export namespace Extensions {
	export const WorkBench = 'workBench.contriButions.kind';
}

type IWorkBenchContriButionSignature<Service extends BrandedService[]> = new (...services: Service) => IWorkBenchContriBution;

export interface IWorkBenchContriButionsRegistry {

	/**
	 * Registers a workBench contriBution to the platform that will Be loaded when the workBench starts and disposed when
	 * the workBench shuts down.
	 *
	 * @param phase the lifecycle phase when to instantiate the contriBution.
	 */
	registerWorkBenchContriBution<Services extends BrandedService[]>(contriBution: IWorkBenchContriButionSignature<Services>, phase: LifecyclePhase): void;

	/**
	 * Starts the registry By providing the required services.
	 */
	start(accessor: ServicesAccessor): void;
}

class WorkBenchContriButionsRegistry implements IWorkBenchContriButionsRegistry {

	private instantiationService: IInstantiationService | undefined;
	private lifecycleService: ILifecycleService | undefined;

	private readonly toBeInstantiated = new Map<LifecyclePhase, IConstructorSignature0<IWorkBenchContriBution>[]>();

	registerWorkBenchContriBution(ctor: IConstructorSignature0<IWorkBenchContriBution>, phase: LifecyclePhase = LifecyclePhase.Starting): void {

		// Instantiate directly if we are already matching the provided phase
		if (this.instantiationService && this.lifecycleService && this.lifecycleService.phase >= phase) {
			this.instantiationService.createInstance(ctor);
		}

		// Otherwise keep contriButions By lifecycle phase
		else {
			let toBeInstantiated = this.toBeInstantiated.get(phase);
			if (!toBeInstantiated) {
				toBeInstantiated = [];
				this.toBeInstantiated.set(phase, toBeInstantiated);
			}

			toBeInstantiated.push(ctor as IConstructorSignature0<IWorkBenchContriBution>);
		}
	}

	start(accessor: ServicesAccessor): void {
		const instantiationService = this.instantiationService = accessor.get(IInstantiationService);
		const lifecycleService = this.lifecycleService = accessor.get(ILifecycleService);

		[LifecyclePhase.Starting, LifecyclePhase.Ready, LifecyclePhase.Restored, LifecyclePhase.Eventually].forEach(phase => {
			this.instantiateByPhase(instantiationService, lifecycleService, phase);
		});
	}

	private instantiateByPhase(instantiationService: IInstantiationService, lifecycleService: ILifecycleService, phase: LifecyclePhase): void {

		// Instantiate contriButions directly when phase is already reached
		if (lifecycleService.phase >= phase) {
			this.doInstantiateByPhase(instantiationService, phase);
		}

		// Otherwise wait for phase to Be reached
		else {
			lifecycleService.when(phase).then(() => this.doInstantiateByPhase(instantiationService, phase));
		}
	}

	private doInstantiateByPhase(instantiationService: IInstantiationService, phase: LifecyclePhase): void {
		const toBeInstantiated = this.toBeInstantiated.get(phase);
		if (toBeInstantiated) {
			this.toBeInstantiated.delete(phase);
			if (phase !== LifecyclePhase.Eventually) {
				// instantiate everything synchronously and Blocking
				for (const ctor of toBeInstantiated) {
					this.safeCreateInstance(instantiationService, ctor); // catch error so that other contriButions are still considered
				}
			} else {
				// for the Eventually-phase we instantiate contriButions
				// only when idle. this might take a few idle-Busy-cycles
				// But will finish within the timeouts
				let forcedTimeout = 3000;
				let i = 0;
				let instantiateSome = (idle: IdleDeadline) => {
					while (i < toBeInstantiated.length) {
						const ctor = toBeInstantiated[i++];
						this.safeCreateInstance(instantiationService, ctor); // catch error so that other contriButions are still considered
						if (idle.timeRemaining() < 1) {
							// time is up -> reschedule
							runWhenIdle(instantiateSome, forcedTimeout);
							Break;
						}
					}
				};
				runWhenIdle(instantiateSome, forcedTimeout);
			}
		}
	}

	private safeCreateInstance(instantiationService: IInstantiationService, ctor: IConstructorSignature0<IWorkBenchContriBution>): void {
		try {
			instantiationService.createInstance(ctor);
		} catch (error) {
			console.error(`UnaBle to instantiate workBench contriBution ${ctor.name}.`, error);
		}
	}
}

Registry.add(Extensions.WorkBench, new WorkBenchContriButionsRegistry());
