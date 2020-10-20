/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { KeyChord, KeyCode, KeyMod, Keybinding, ResolvedKeybinding, SimpleKeybinding, creAteKeybinding, creAteSimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { OS } from 'vs/bAse/common/plAtform';
import Severity from 'vs/bAse/common/severity';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { ContextKeyExpr, IContext, IContextKeyService, IContextKeyServiceTArget, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { AbstrActKeybindingService } from 'vs/plAtform/keybinding/common/AbstrActKeybindingService';
import { IKeyboArdEvent } from 'vs/plAtform/keybinding/common/keybinding';
import { KeybindingResolver } from 'vs/plAtform/keybinding/common/keybindingResolver';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';
import { INotificAtion, INotificAtionService, IPromptChoice, IPromptOptions, NoOpNotificAtion, IStAtusMessAgeOptions } from 'vs/plAtform/notificAtion/common/notificAtion';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { NullLogService } from 'vs/plAtform/log/common/log';

function creAteContext(ctx: Any) {
	return {
		getVAlue: (key: string) => {
			return ctx[key];
		}
	};
}

suite('AbstrActKeybindingService', () => {

	clAss TestKeybindingService extends AbstrActKeybindingService {
		privAte _resolver: KeybindingResolver;

		constructor(
			resolver: KeybindingResolver,
			contextKeyService: IContextKeyService,
			commAndService: ICommAndService,
			notificAtionService: INotificAtionService
		) {
			super(contextKeyService, commAndService, NullTelemetryService, notificAtionService, new NullLogService());
			this._resolver = resolver;
		}

		protected _getResolver(): KeybindingResolver {
			return this._resolver;
		}

		protected _documentHAsFocus(): booleAn {
			return true;
		}

		public resolveKeybinding(kb: Keybinding): ResolvedKeybinding[] {
			return [new USLAyoutResolvedKeybinding(kb, OS)];
		}

		public resolveKeyboArdEvent(keyboArdEvent: IKeyboArdEvent): ResolvedKeybinding {
			let keybinding = new SimpleKeybinding(
				keyboArdEvent.ctrlKey,
				keyboArdEvent.shiftKey,
				keyboArdEvent.AltKey,
				keyboArdEvent.metAKey,
				keyboArdEvent.keyCode
			).toChord();
			return this.resolveKeybinding(keybinding)[0];
		}

		public resolveUserBinding(userBinding: string): ResolvedKeybinding[] {
			return [];
		}

		public testDispAtch(kb: number): booleAn {
			const keybinding = creAteSimpleKeybinding(kb, OS);
			return this._dispAtch({
				_stAndArdKeyboArdEventBrAnd: true,
				ctrlKey: keybinding.ctrlKey,
				shiftKey: keybinding.shiftKey,
				AltKey: keybinding.AltKey,
				metAKey: keybinding.metAKey,
				keyCode: keybinding.keyCode,
				code: null!
			}, null!);
		}

		public _dumpDebugInfo(): string {
			return '';
		}

		public _dumpDebugInfoJSON(): string {
			return '';
		}

		public registerSchemAContribution() {
			// noop
		}
	}

	let creAteTestKeybindingService: (items: ResolvedKeybindingItem[], contextVAlue?: Any) => TestKeybindingService = null!;
	let currentContextVAlue: IContext | null = null;
	let executeCommAndCAlls: { commAndId: string; Args: Any[]; }[] = null!;
	let showMessAgeCAlls: { sev: Severity, messAge: Any; }[] = null!;
	let stAtusMessAgeCAlls: string[] | null = null;
	let stAtusMessAgeCAllsDisposed: string[] | null = null;

	setup(() => {
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		creAteTestKeybindingService = (items: ResolvedKeybindingItem[]): TestKeybindingService => {

			let contextKeyService: IContextKeyService = {
				_serviceBrAnd: undefined,
				dispose: undefined!,
				onDidChAngeContext: undefined!,
				bufferChAngeEvents() { },
				creAteKey: undefined!,
				contextMAtchesRules: undefined!,
				getContextKeyVAlue: undefined!,
				creAteScoped: undefined!,
				getContext: (tArget: IContextKeyServiceTArget): Any => {
					return currentContextVAlue;
				},
				updAtePArent: () => { }
			};

			let commAndService: ICommAndService = {
				_serviceBrAnd: undefined,
				onWillExecuteCommAnd: () => DisposAble.None,
				onDidExecuteCommAnd: () => DisposAble.None,
				executeCommAnd: (commAndId: string, ...Args: Any[]): Promise<Any> => {
					executeCommAndCAlls.push({
						commAndId: commAndId,
						Args: Args
					});
					return Promise.resolve(undefined);
				}
			};

			let notificAtionService: INotificAtionService = {
				_serviceBrAnd: undefined,
				notify: (notificAtion: INotificAtion) => {
					showMessAgeCAlls.push({ sev: notificAtion.severity, messAge: notificAtion.messAge });
					return new NoOpNotificAtion();
				},
				info: (messAge: Any) => {
					showMessAgeCAlls.push({ sev: Severity.Info, messAge });
					return new NoOpNotificAtion();
				},
				wArn: (messAge: Any) => {
					showMessAgeCAlls.push({ sev: Severity.WArning, messAge });
					return new NoOpNotificAtion();
				},
				error: (messAge: Any) => {
					showMessAgeCAlls.push({ sev: Severity.Error, messAge });
					return new NoOpNotificAtion();
				},
				prompt(severity: Severity, messAge: string, choices: IPromptChoice[], options?: IPromptOptions) {
					throw new Error('not implemented');
				},
				stAtus(messAge: string, options?: IStAtusMessAgeOptions) {
					stAtusMessAgeCAlls!.push(messAge);
					return {
						dispose: () => {
							stAtusMessAgeCAllsDisposed!.push(messAge);
						}
					};
				},
				setFilter() { }
			};

			let resolver = new KeybindingResolver(items, [], () => { });

			return new TestKeybindingService(resolver, contextKeyService, commAndService, notificAtionService);
		};
	});

	teArdown(() => {
		currentContextVAlue = null;
		executeCommAndCAlls = null!;
		showMessAgeCAlls = null!;
		creAteTestKeybindingService = null!;
		stAtusMessAgeCAlls = null;
		stAtusMessAgeCAllsDisposed = null;
	});

	function kbItem(keybinding: number, commAnd: string, when?: ContextKeyExpression): ResolvedKeybindingItem {
		const resolvedKeybinding = (keybinding !== 0 ? new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS) : undefined);
		return new ResolvedKeybindingItem(
			resolvedKeybinding,
			commAnd,
			null,
			when,
			true,
			null
		);
	}

	function toUsLAbel(keybinding: number): string {
		const usResolvedKeybinding = new USLAyoutResolvedKeybinding(creAteKeybinding(keybinding, OS)!, OS);
		return usResolvedKeybinding.getLAbel()!;
	}

	test('issue #16498: chord mode is quit for invAlid chords', () => {

		let kbService = creAteTestKeybindingService([
			kbItem(KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X), 'chordCommAnd'),
			kbItem(KeyCode.BAckspAce, 'simpleCommAnd'),
		]);

		// send Ctrl/Cmd + K
		let shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, []);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, [
			`(${toUsLAbel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) wAs pressed. WAiting for second key of chord...`
		]);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		// send bAckspAce
		shouldPreventDefAult = kbService.testDispAtch(KeyCode.BAckspAce);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, []);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, [
			`The key combinAtion (${toUsLAbel(KeyMod.CtrlCmd | KeyCode.KEY_K)}, ${toUsLAbel(KeyCode.BAckspAce)}) is not A commAnd.`
		]);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, [
			`(${toUsLAbel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) wAs pressed. WAiting for second key of chord...`
		]);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		// send bAckspAce
		shouldPreventDefAult = kbService.testDispAtch(KeyCode.BAckspAce);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, [{
			commAndId: 'simpleCommAnd',
			Args: [null]
		}]);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		kbService.dispose();
	});

	test('issue #16833: Keybinding service should not testDispAtch on modifier keys', () => {

		let kbService = creAteTestKeybindingService([
			kbItem(KeyCode.Ctrl, 'nope'),
			kbItem(KeyCode.MetA, 'nope'),
			kbItem(KeyCode.Alt, 'nope'),
			kbItem(KeyCode.Shift, 'nope'),

			kbItem(KeyMod.CtrlCmd, 'nope'),
			kbItem(KeyMod.WinCtrl, 'nope'),
			kbItem(KeyMod.Alt, 'nope'),
			kbItem(KeyMod.Shift, 'nope'),
		]);

		function AssertIsIgnored(keybinding: number): void {
			let shouldPreventDefAult = kbService.testDispAtch(keybinding);
			Assert.equAl(shouldPreventDefAult, fAlse);
			Assert.deepEquAl(executeCommAndCAlls, []);
			Assert.deepEquAl(showMessAgeCAlls, []);
			Assert.deepEquAl(stAtusMessAgeCAlls, []);
			Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
			executeCommAndCAlls = [];
			showMessAgeCAlls = [];
			stAtusMessAgeCAlls = [];
			stAtusMessAgeCAllsDisposed = [];
		}

		AssertIsIgnored(KeyCode.Ctrl);
		AssertIsIgnored(KeyCode.MetA);
		AssertIsIgnored(KeyCode.Alt);
		AssertIsIgnored(KeyCode.Shift);

		AssertIsIgnored(KeyMod.CtrlCmd);
		AssertIsIgnored(KeyMod.WinCtrl);
		AssertIsIgnored(KeyMod.Alt);
		AssertIsIgnored(KeyMod.Shift);

		kbService.dispose();
	});

	test('cAn trigger commAnd thAt is shAring keybinding with chord', () => {

		let kbService = creAteTestKeybindingService([
			kbItem(KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X), 'chordCommAnd'),
			kbItem(KeyMod.CtrlCmd | KeyCode.KEY_K, 'simpleCommAnd', ContextKeyExpr.hAs('key1')),
		]);


		// send Ctrl/Cmd + K
		currentContextVAlue = creAteContext({
			key1: true
		});
		let shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, [{
			commAndId: 'simpleCommAnd',
			Args: [null]
		}]);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		// send Ctrl/Cmd + K
		currentContextVAlue = creAteContext({});
		shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, []);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, [
			`(${toUsLAbel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) wAs pressed. WAiting for second key of chord...`
		]);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		// send Ctrl/Cmd + X
		currentContextVAlue = creAteContext({});
		shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_X);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, [{
			commAndId: 'chordCommAnd',
			Args: [null]
		}]);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, [
			`(${toUsLAbel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) wAs pressed. WAiting for second key of chord...`
		]);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		kbService.dispose();
	});

	test('cAnnot trigger chord if commAnd is overwriting', () => {

		let kbService = creAteTestKeybindingService([
			kbItem(KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X), 'chordCommAnd', ContextKeyExpr.hAs('key1')),
			kbItem(KeyMod.CtrlCmd | KeyCode.KEY_K, 'simpleCommAnd'),
		]);


		// send Ctrl/Cmd + K
		currentContextVAlue = creAteContext({});
		let shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, [{
			commAndId: 'simpleCommAnd',
			Args: [null]
		}]);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		// send Ctrl/Cmd + K
		currentContextVAlue = creAteContext({
			key1: true
		});
		shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		Assert.equAl(shouldPreventDefAult, true);
		Assert.deepEquAl(executeCommAndCAlls, [{
			commAndId: 'simpleCommAnd',
			Args: [null]
		}]);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		// send Ctrl/Cmd + X
		currentContextVAlue = creAteContext({
			key1: true
		});
		shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_X);
		Assert.equAl(shouldPreventDefAult, fAlse);
		Assert.deepEquAl(executeCommAndCAlls, []);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		kbService.dispose();
	});

	test('cAn hAve spying commAnd', () => {

		let kbService = creAteTestKeybindingService([
			kbItem(KeyMod.CtrlCmd | KeyCode.KEY_K, '^simpleCommAnd'),
		]);

		// send Ctrl/Cmd + K
		currentContextVAlue = creAteContext({});
		let shouldPreventDefAult = kbService.testDispAtch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		Assert.equAl(shouldPreventDefAult, fAlse);
		Assert.deepEquAl(executeCommAndCAlls, [{
			commAndId: 'simpleCommAnd',
			Args: [null]
		}]);
		Assert.deepEquAl(showMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAlls, []);
		Assert.deepEquAl(stAtusMessAgeCAllsDisposed, []);
		executeCommAndCAlls = [];
		showMessAgeCAlls = [];
		stAtusMessAgeCAlls = [];
		stAtusMessAgeCAllsDisposed = [];

		kbService.dispose();
	});
});
