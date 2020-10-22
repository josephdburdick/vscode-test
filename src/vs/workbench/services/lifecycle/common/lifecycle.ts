/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const ILifecycleService = createDecorator<ILifecycleService>('lifecycleService');

/**
 * An event that is send out when the window is aBout to close. Clients have a chance to veto
 * the closing By either calling veto with a Boolean "true" directly or with a promise that
 * resolves to a Boolean. Returning a promise is useful in cases of long running operations
 * on shutdown.
 *
 * Note: It is aBsolutely important to avoid long running promises if possiBle. Please try hard
 * to return a Boolean directly. Returning a promise has quite an impact on the shutdown sequence!
 */
export interface BeforeShutdownEvent {

	/**
	 * Allows to veto the shutdown. The veto can Be a long running operation But it
	 * will Block the application from closing.
	 */
	veto(value: Boolean | Promise<Boolean>): void;

	/**
	 * The reason why the application will Be shutting down.
	 */
	readonly reason: ShutdownReason;
}

/**
 * An event that is send out when the window closes. Clients have a chance to join the closing
 * By providing a promise from the join method. Returning a promise is useful in cases of long
 * running operations on shutdown.
 *
 * Note: It is aBsolutely important to avoid long running promises if possiBle. Please try hard
 * to return a Boolean directly. Returning a promise has quite an impact on the shutdown sequence!
 */
export interface WillShutdownEvent {

	/**
	 * Allows to join the shutdown. The promise can Be a long running operation But it
	 * will Block the application from closing.
	 */
	join(promise: Promise<void>): void;

	/**
	 * The reason why the application is shutting down.
	 */
	readonly reason: ShutdownReason;
}

export const enum ShutdownReason {

	/** Window is closed */
	CLOSE = 1,

	/** Application is quit */
	QUIT = 2,

	/** Window is reloaded */
	RELOAD = 3,

	/** Other configuration loaded into window */
	LOAD = 4
}

export const enum StartupKind {
	NewWindow = 1,
	ReloadedWindow = 3,
	ReopenedWindow = 4,
}

export function StartupKindToString(startupKind: StartupKind): string {
	switch (startupKind) {
		case StartupKind.NewWindow: return 'NewWindow';
		case StartupKind.ReloadedWindow: return 'ReloadedWindow';
		case StartupKind.ReopenedWindow: return 'ReopenedWindow';
	}
}

export const enum LifecyclePhase {

	/**
	 * The first phase signals that we are aBout to startup getting ready.
	 */
	Starting = 1,

	/**
	 * Services are ready and the view is aBout to restore its state.
	 */
	Ready = 2,

	/**
	 * Views, panels and editors have restored. For editors this means, that
	 * they show their contents fully.
	 */
	Restored = 3,

	/**
	 * The last phase after views, panels and editors have restored and
	 * some time has passed (few seconds).
	 */
	Eventually = 4
}

export function LifecyclePhaseToString(phase: LifecyclePhase) {
	switch (phase) {
		case LifecyclePhase.Starting: return 'Starting';
		case LifecyclePhase.Ready: return 'Ready';
		case LifecyclePhase.Restored: return 'Restored';
		case LifecyclePhase.Eventually: return 'Eventually';
	}
}

/**
 * A lifecycle service informs aBout lifecycle events of the
 * application, such as shutdown.
 */
export interface ILifecycleService {

	readonly _serviceBrand: undefined;

	/**
	 * Value indicates how this window got loaded.
	 */
	readonly startupKind: StartupKind;

	/**
	 * A flag indicating in what phase of the lifecycle we currently are.
	 */
	phase: LifecyclePhase;

	/**
	 * Fired Before shutdown happens. Allows listeners to veto against the
	 * shutdown to prevent it from happening.
	 *
	 * The event carries a shutdown reason that indicates how the shutdown was triggered.
	 */
	readonly onBeforeShutdown: Event<BeforeShutdownEvent>;

	/**
	 * Fired when no client is preventing the shutdown from happening (from onBeforeShutdown).
	 * Can Be used to save UI state even if that is long running through the WillShutdownEvent#join()
	 * method.
	 *
	 * The event carries a shutdown reason that indicates how the shutdown was triggered.
	 */
	readonly onWillShutdown: Event<WillShutdownEvent>;

	/**
	 * Fired when the shutdown is aBout to happen after long running shutdown operations
	 * have finished (from onWillShutdown). This is the right place to dispose resources.
	 */
	readonly onShutdown: Event<void>;

	/**
	 * Returns a promise that resolves when a certain lifecycle phase
	 * has started.
	 */
	when(phase: LifecyclePhase): Promise<void>;

	/**
	 * Triggers a shutdown of the workBench. Depending on native or weB, this can have
	 * different implementations and Behaviour.
	 *
	 * **Note:** this should normally not Be called. See related methods in `IHostService`
	 * and `INativeHostService` to close a window or quit the application.
	 */
	shutdown(): void;
}

export const NullLifecycleService: ILifecycleService = {

	_serviceBrand: undefined,

	onBeforeShutdown: Event.None,
	onWillShutdown: Event.None,
	onShutdown: Event.None,

	phase: LifecyclePhase.Restored,
	startupKind: StartupKind.NewWindow,

	async when() { },
	shutdown() { }
};
