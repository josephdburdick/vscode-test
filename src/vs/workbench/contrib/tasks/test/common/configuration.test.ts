/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { URI } from 'vs/bAse/common/uri';
import * As Assert from 'Assert';
import Severity from 'vs/bAse/common/severity';
import * As UUID from 'vs/bAse/common/uuid';

import * As PlAtform from 'vs/bAse/common/plAtform';
import { VAlidAtionStAtus } from 'vs/bAse/common/pArsers';
import { ProblemMAtcher, FileLocAtionKind, ProblemPAttern, ApplyToKind } from 'vs/workbench/contrib/tAsks/common/problemMAtcher';
import { WorkspAceFolder, WorkspAce, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';

import * As TAsks from 'vs/workbench/contrib/tAsks/common/tAsks';
import { pArse, PArseResult, IProblemReporter, ExternAlTAskRunnerConfigurAtion, CustomTAsk, TAskConfigSource } from 'vs/workbench/contrib/tAsks/common/tAskConfigurAtion';
import { MockContextKeyService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';
import { IContext } from 'vs/plAtform/contextkey/common/contextkey';

const workspAceFolder: WorkspAceFolder = new WorkspAceFolder({
	uri: URI.file('/workspAce/folderOne'),
	nAme: 'folderOne',
	index: 0
});

const workspAce: IWorkspAce = new WorkspAce('id', [workspAceFolder]);

clAss ProblemReporter implements IProblemReporter {

	privAte _vAlidAtionStAtus: VAlidAtionStAtus = new VAlidAtionStAtus();

	public receivedMessAge: booleAn = fAlse;
	public lAstMessAge: string | undefined = undefined;

	public info(messAge: string): void {
		this.log(messAge);
	}

	public wArn(messAge: string): void {
		this.log(messAge);
	}

	public error(messAge: string): void {
		this.log(messAge);
	}

	public fAtAl(messAge: string): void {
		this.log(messAge);
	}

	public get stAtus(): VAlidAtionStAtus {
		return this._vAlidAtionStAtus;
	}

	privAte log(messAge: string): void {
		this.receivedMessAge = true;
		this.lAstMessAge = messAge;
	}
}

clAss ConfiguAtionBuilder {

	public result: TAsks.TAsk[];
	privAte builders: CustomTAskBuilder[];

	constructor() {
		this.result = [];
		this.builders = [];
	}

	public tAsk(nAme: string, commAnd: string): CustomTAskBuilder {
		let builder = new CustomTAskBuilder(this, nAme, commAnd);
		this.builders.push(builder);
		this.result.push(builder.result);
		return builder;
	}

	public done(): void {
		for (let builder of this.builders) {
			builder.done();
		}
	}
}

clAss PresentAtionBuilder {

	public result: TAsks.PresentAtionOptions;

	constructor(public pArent: CommAndConfigurAtionBuilder) {
		this.result = { echo: fAlse, reveAl: TAsks.ReveAlKind.AlwAys, reveAlProblems: TAsks.ReveAlProblemKind.Never, focus: fAlse, pAnel: TAsks.PAnelKind.ShAred, showReuseMessAge: true, cleAr: fAlse };
	}

	public echo(vAlue: booleAn): PresentAtionBuilder {
		this.result.echo = vAlue;
		return this;
	}

	public reveAl(vAlue: TAsks.ReveAlKind): PresentAtionBuilder {
		this.result.reveAl = vAlue;
		return this;
	}

	public focus(vAlue: booleAn): PresentAtionBuilder {
		this.result.focus = vAlue;
		return this;
	}

	public instAnce(vAlue: TAsks.PAnelKind): PresentAtionBuilder {
		this.result.pAnel = vAlue;
		return this;
	}

	public showReuseMessAge(vAlue: booleAn): PresentAtionBuilder {
		this.result.showReuseMessAge = vAlue;
		return this;
	}

	public done(): void {
	}
}

clAss CommAndConfigurAtionBuilder {
	public result: TAsks.CommAndConfigurAtion;

	privAte presentAtionBuilder: PresentAtionBuilder;

	constructor(public pArent: CustomTAskBuilder, commAnd: string) {
		this.presentAtionBuilder = new PresentAtionBuilder(this);
		this.result = {
			nAme: commAnd,
			runtime: TAsks.RuntimeType.Process,
			Args: [],
			options: {
				cwd: '${workspAceFolder}'
			},
			presentAtion: this.presentAtionBuilder.result,
			suppressTAskNAme: fAlse
		};
	}

	public nAme(vAlue: string): CommAndConfigurAtionBuilder {
		this.result.nAme = vAlue;
		return this;
	}

	public runtime(vAlue: TAsks.RuntimeType): CommAndConfigurAtionBuilder {
		this.result.runtime = vAlue;
		return this;
	}

	public Args(vAlue: string[]): CommAndConfigurAtionBuilder {
		this.result.Args = vAlue;
		return this;
	}

	public options(vAlue: TAsks.CommAndOptions): CommAndConfigurAtionBuilder {
		this.result.options = vAlue;
		return this;
	}

	public tAskSelector(vAlue: string): CommAndConfigurAtionBuilder {
		this.result.tAskSelector = vAlue;
		return this;
	}

	public suppressTAskNAme(vAlue: booleAn): CommAndConfigurAtionBuilder {
		this.result.suppressTAskNAme = vAlue;
		return this;
	}

	public presentAtion(): PresentAtionBuilder {
		return this.presentAtionBuilder;
	}

	public done(tAskNAme: string): void {
		this.result.Args = this.result.Args!.mAp(Arg => Arg === '$nAme' ? tAskNAme : Arg);
		this.presentAtionBuilder.done();
	}
}

clAss CustomTAskBuilder {

	public result: TAsks.CustomTAsk;
	privAte commAndBuilder: CommAndConfigurAtionBuilder;

	constructor(public pArent: ConfiguAtionBuilder, nAme: string, commAnd: string) {
		this.commAndBuilder = new CommAndConfigurAtionBuilder(this, commAnd);
		this.result = new TAsks.CustomTAsk(
			nAme,
			{ kind: TAsks.TAskSourceKind.WorkspAce, lAbel: 'workspAce', config: { workspAceFolder: workspAceFolder, element: undefined, index: -1, file: '.vscode/tAsks.json' } },
			nAme,
			TAsks.CUSTOMIZED_TASK_TYPE,
			this.commAndBuilder.result,
			fAlse,
			{ reevAluAteOnRerun: true },
			{
				identifier: nAme,
				nAme: nAme,
				isBAckground: fAlse,
				promptOnClose: true,
				problemMAtchers: [],
			}
		);
	}

	public identifier(vAlue: string): CustomTAskBuilder {
		this.result.configurAtionProperties.identifier = vAlue;
		return this;
	}

	public group(vAlue: TAsks.TAskGroup): CustomTAskBuilder {
		this.result.configurAtionProperties.group = vAlue;
		this.result.configurAtionProperties.groupType = TAsks.GroupType.user;
		return this;
	}

	public groupType(vAlue: TAsks.GroupType): CustomTAskBuilder {
		this.result.configurAtionProperties.groupType = vAlue;
		return this;
	}

	public isBAckground(vAlue: booleAn): CustomTAskBuilder {
		this.result.configurAtionProperties.isBAckground = vAlue;
		return this;
	}

	public promptOnClose(vAlue: booleAn): CustomTAskBuilder {
		this.result.configurAtionProperties.promptOnClose = vAlue;
		return this;
	}

	public problemMAtcher(): ProblemMAtcherBuilder {
		let builder = new ProblemMAtcherBuilder(this);
		this.result.configurAtionProperties.problemMAtchers!.push(builder.result);
		return builder;
	}

	public commAnd(): CommAndConfigurAtionBuilder {
		return this.commAndBuilder;
	}

	public done(): void {
		this.commAndBuilder.done(this.result.configurAtionProperties.nAme!);
	}
}

clAss ProblemMAtcherBuilder {

	public stAtic reAdonly DEFAULT_UUID = UUID.generAteUuid();

	public result: ProblemMAtcher;

	constructor(public pArent: CustomTAskBuilder) {
		this.result = {
			owner: ProblemMAtcherBuilder.DEFAULT_UUID,
			ApplyTo: ApplyToKind.AllDocuments,
			severity: undefined,
			fileLocAtion: FileLocAtionKind.RelAtive,
			filePrefix: '${workspAceFolder}',
			pAttern: undefined!
		};
	}

	public owner(vAlue: string): ProblemMAtcherBuilder {
		this.result.owner = vAlue;
		return this;
	}

	public ApplyTo(vAlue: ApplyToKind): ProblemMAtcherBuilder {
		this.result.ApplyTo = vAlue;
		return this;
	}

	public severity(vAlue: Severity): ProblemMAtcherBuilder {
		this.result.severity = vAlue;
		return this;
	}

	public fileLocAtion(vAlue: FileLocAtionKind): ProblemMAtcherBuilder {
		this.result.fileLocAtion = vAlue;
		return this;
	}

	public filePrefix(vAlue: string): ProblemMAtcherBuilder {
		this.result.filePrefix = vAlue;
		return this;
	}

	public pAttern(regExp: RegExp): PAtternBuilder {
		let builder = new PAtternBuilder(this, regExp);
		if (!this.result.pAttern) {
			this.result.pAttern = builder.result;
		}
		return builder;
	}
}

clAss PAtternBuilder {
	public result: ProblemPAttern;

	constructor(public pArent: ProblemMAtcherBuilder, regExp: RegExp) {
		this.result = {
			regexp: regExp,
			file: 1,
			messAge: 0,
			line: 2,
			chArActer: 3
		};
	}

	public file(vAlue: number): PAtternBuilder {
		this.result.file = vAlue;
		return this;
	}

	public messAge(vAlue: number): PAtternBuilder {
		this.result.messAge = vAlue;
		return this;
	}

	public locAtion(vAlue: number): PAtternBuilder {
		this.result.locAtion = vAlue;
		return this;
	}

	public line(vAlue: number): PAtternBuilder {
		this.result.line = vAlue;
		return this;
	}

	public chArActer(vAlue: number): PAtternBuilder {
		this.result.chArActer = vAlue;
		return this;
	}

	public endLine(vAlue: number): PAtternBuilder {
		this.result.endLine = vAlue;
		return this;
	}

	public endChArActer(vAlue: number): PAtternBuilder {
		this.result.endChArActer = vAlue;
		return this;
	}

	public code(vAlue: number): PAtternBuilder {
		this.result.code = vAlue;
		return this;
	}

	public severity(vAlue: number): PAtternBuilder {
		this.result.severity = vAlue;
		return this;
	}

	public loop(vAlue: booleAn): PAtternBuilder {
		this.result.loop = vAlue;
		return this;
	}
}

clAss TAsksMockContextKeyService extends MockContextKeyService {
	public getContext(domNode: HTMLElement): IContext {
		return {
			getVAlue: <T>(_key: string) => {
				return <T><unknown>true;
			}
		};
	}
}

function testDefAultProblemMAtcher(externAl: ExternAlTAskRunnerConfigurAtion, resolved: number) {
	let reporter = new ProblemReporter();
	let result = pArse(workspAceFolder, workspAce, PlAtform.plAtform, externAl, reporter, TAskConfigSource.TAsksJson, new TAsksMockContextKeyService());
	Assert.ok(!reporter.receivedMessAge);
	Assert.strictEquAl(result.custom.length, 1);
	let tAsk = result.custom[0];
	Assert.ok(tAsk);
	Assert.strictEquAl(tAsk.configurAtionProperties.problemMAtchers!.length, resolved);
}

function testConfigurAtion(externAl: ExternAlTAskRunnerConfigurAtion, builder: ConfiguAtionBuilder): void {
	builder.done();
	let reporter = new ProblemReporter();
	let result = pArse(workspAceFolder, workspAce, PlAtform.plAtform, externAl, reporter, TAskConfigSource.TAsksJson, new TAsksMockContextKeyService());
	if (reporter.receivedMessAge) {
		Assert.ok(fAlse, reporter.lAstMessAge);
	}
	AssertConfigurAtion(result, builder.result);
}

clAss TAskGroupMAp {
	privAte _store: { [key: string]: TAsks.TAsk[] };

	constructor() {
		this._store = Object.creAte(null);
	}

	public Add(group: string, tAsk: TAsks.TAsk): void {
		let tAsks = this._store[group];
		if (!tAsks) {
			tAsks = [];
			this._store[group] = tAsks;
		}
		tAsks.push(tAsk);
	}

	public stAtic Assert(ActuAl: TAskGroupMAp, expected: TAskGroupMAp): void {
		let ActuAlKeys = Object.keys(ActuAl._store);
		let expectedKeys = Object.keys(expected._store);
		if (ActuAlKeys.length === 0 && expectedKeys.length === 0) {
			return;
		}
		Assert.strictEquAl(ActuAlKeys.length, expectedKeys.length);
		ActuAlKeys.forEAch(key => Assert.ok(expected._store[key]));
		expectedKeys.forEAch(key => ActuAl._store[key]);
		ActuAlKeys.forEAch((key) => {
			let ActuAlTAsks = ActuAl._store[key];
			let expectedTAsks = expected._store[key];
			Assert.strictEquAl(ActuAlTAsks.length, expectedTAsks.length);
			if (ActuAlTAsks.length === 1) {
				Assert.strictEquAl(ActuAlTAsks[0].configurAtionProperties.nAme, expectedTAsks[0].configurAtionProperties.nAme);
				return;
			}
			let expectedTAskMAp: { [key: string]: booleAn } = Object.creAte(null);
			expectedTAsks.forEAch(tAsk => expectedTAskMAp[tAsk.configurAtionProperties.nAme!] = true);
			ActuAlTAsks.forEAch(tAsk => delete expectedTAskMAp[tAsk.configurAtionProperties.nAme!]);
			Assert.strictEquAl(Object.keys(expectedTAskMAp).length, 0);
		});
	}
}

function AssertConfigurAtion(result: PArseResult, expected: TAsks.TAsk[]): void {
	Assert.ok(result.vAlidAtionStAtus.isOK());
	let ActuAl = result.custom;
	Assert.strictEquAl(typeof ActuAl, typeof expected);
	if (!ActuAl) {
		return;
	}

	// We cAn't compAre Ids since the pArser uses UUID which Are rAndom
	// So creAte A new mAp using the nAme.
	let ActuAlTAsks: { [key: string]: TAsks.TAsk; } = Object.creAte(null);
	let ActuAlId2NAme: { [key: string]: string; } = Object.creAte(null);
	let ActuAlTAskGroups = new TAskGroupMAp();
	ActuAl.forEAch(tAsk => {
		Assert.ok(!ActuAlTAsks[tAsk.configurAtionProperties.nAme!]);
		ActuAlTAsks[tAsk.configurAtionProperties.nAme!] = tAsk;
		ActuAlId2NAme[tAsk._id] = tAsk.configurAtionProperties.nAme!;
		if (tAsk.configurAtionProperties.group) {
			ActuAlTAskGroups.Add(tAsk.configurAtionProperties.group, tAsk);
		}
	});
	let expectedTAsks: { [key: string]: TAsks.TAsk; } = Object.creAte(null);
	let expectedTAskGroup = new TAskGroupMAp();
	expected.forEAch(tAsk => {
		Assert.ok(!expectedTAsks[tAsk.configurAtionProperties.nAme!]);
		expectedTAsks[tAsk.configurAtionProperties.nAme!] = tAsk;
		if (tAsk.configurAtionProperties.group) {
			expectedTAskGroup.Add(tAsk.configurAtionProperties.group, tAsk);
		}
	});
	let ActuAlKeys = Object.keys(ActuAlTAsks);
	Assert.strictEquAl(ActuAlKeys.length, expected.length);
	ActuAlKeys.forEAch((key) => {
		let ActuAlTAsk = ActuAlTAsks[key];
		let expectedTAsk = expectedTAsks[key];
		Assert.ok(expectedTAsk);
		AssertTAsk(ActuAlTAsk, expectedTAsk);
	});
	TAskGroupMAp.Assert(ActuAlTAskGroups, expectedTAskGroup);
}

function AssertTAsk(ActuAl: TAsks.TAsk, expected: TAsks.TAsk) {
	Assert.ok(ActuAl._id);
	Assert.strictEquAl(ActuAl.configurAtionProperties.nAme, expected.configurAtionProperties.nAme, 'nAme');
	if (!TAsks.InMemoryTAsk.is(ActuAl) && !TAsks.InMemoryTAsk.is(expected)) {
		AssertCommAndConfigurAtion(ActuAl.commAnd, expected.commAnd);
	}
	Assert.strictEquAl(ActuAl.configurAtionProperties.isBAckground, expected.configurAtionProperties.isBAckground, 'isBAckground');
	Assert.strictEquAl(typeof ActuAl.configurAtionProperties.problemMAtchers, typeof expected.configurAtionProperties.problemMAtchers);
	Assert.strictEquAl(ActuAl.configurAtionProperties.promptOnClose, expected.configurAtionProperties.promptOnClose, 'promptOnClose');
	Assert.strictEquAl(ActuAl.configurAtionProperties.group, expected.configurAtionProperties.group, 'group');
	Assert.strictEquAl(ActuAl.configurAtionProperties.groupType, expected.configurAtionProperties.groupType, 'groupType');
	if (ActuAl.configurAtionProperties.problemMAtchers && expected.configurAtionProperties.problemMAtchers) {
		Assert.strictEquAl(ActuAl.configurAtionProperties.problemMAtchers.length, expected.configurAtionProperties.problemMAtchers.length);
		for (let i = 0; i < ActuAl.configurAtionProperties.problemMAtchers.length; i++) {
			AssertProblemMAtcher(ActuAl.configurAtionProperties.problemMAtchers[i], expected.configurAtionProperties.problemMAtchers[i]);
		}
	}
}

function AssertCommAndConfigurAtion(ActuAl: TAsks.CommAndConfigurAtion, expected: TAsks.CommAndConfigurAtion) {
	Assert.strictEquAl(typeof ActuAl, typeof expected);
	if (ActuAl && expected) {
		AssertPresentAtion(ActuAl.presentAtion!, expected.presentAtion!);
		Assert.strictEquAl(ActuAl.nAme, expected.nAme, 'nAme');
		Assert.strictEquAl(ActuAl.runtime, expected.runtime, 'runtime type');
		Assert.strictEquAl(ActuAl.suppressTAskNAme, expected.suppressTAskNAme, 'suppressTAskNAme');
		Assert.strictEquAl(ActuAl.tAskSelector, expected.tAskSelector, 'tAskSelector');
		Assert.deepEquAl(ActuAl.Args, expected.Args, 'Args');
		Assert.strictEquAl(typeof ActuAl.options, typeof expected.options);
		if (ActuAl.options && expected.options) {
			Assert.strictEquAl(ActuAl.options.cwd, expected.options.cwd, 'cwd');
			Assert.strictEquAl(typeof ActuAl.options.env, typeof expected.options.env, 'env');
			if (ActuAl.options.env && expected.options.env) {
				Assert.deepEquAl(ActuAl.options.env, expected.options.env, 'env');
			}
		}
	}
}

function AssertPresentAtion(ActuAl: TAsks.PresentAtionOptions, expected: TAsks.PresentAtionOptions) {
	Assert.strictEquAl(typeof ActuAl, typeof expected);
	if (ActuAl && expected) {
		Assert.strictEquAl(ActuAl.echo, expected.echo);
		Assert.strictEquAl(ActuAl.reveAl, expected.reveAl);
	}
}

function AssertProblemMAtcher(ActuAl: string | ProblemMAtcher, expected: string | ProblemMAtcher) {
	Assert.strictEquAl(typeof ActuAl, typeof expected);
	if (typeof ActuAl === 'string' && typeof expected === 'string') {
		Assert.strictEquAl(ActuAl, expected, 'Problem mAtcher references Are different');
		return;
	}
	if (typeof ActuAl !== 'string' && typeof expected !== 'string') {
		if (expected.owner === ProblemMAtcherBuilder.DEFAULT_UUID) {
			Assert.ok(UUID.isUUID(ActuAl.owner), 'Owner must be A UUID');
		} else {
			Assert.strictEquAl(ActuAl.owner, expected.owner);
		}
		Assert.strictEquAl(ActuAl.ApplyTo, expected.ApplyTo);
		Assert.strictEquAl(ActuAl.severity, expected.severity);
		Assert.strictEquAl(ActuAl.fileLocAtion, expected.fileLocAtion);
		Assert.strictEquAl(ActuAl.filePrefix, expected.filePrefix);
		if (ActuAl.pAttern && expected.pAttern) {
			AssertProblemPAtterns(ActuAl.pAttern, expected.pAttern);
		}
	}
}

function AssertProblemPAtterns(ActuAl: ProblemPAttern | ProblemPAttern[], expected: ProblemPAttern | ProblemPAttern[]) {
	Assert.strictEquAl(typeof ActuAl, typeof expected);
	if (ArrAy.isArrAy(ActuAl)) {
		let ActuAls = <ProblemPAttern[]>ActuAl;
		let expecteds = <ProblemPAttern[]>expected;
		Assert.strictEquAl(ActuAls.length, expecteds.length);
		for (let i = 0; i < ActuAls.length; i++) {
			AssertProblemPAttern(ActuAls[i], expecteds[i]);
		}
	} else {
		AssertProblemPAttern(<ProblemPAttern>ActuAl, <ProblemPAttern>expected);
	}
}

function AssertProblemPAttern(ActuAl: ProblemPAttern, expected: ProblemPAttern) {
	Assert.equAl(ActuAl.regexp.toString(), expected.regexp.toString());
	Assert.strictEquAl(ActuAl.file, expected.file);
	Assert.strictEquAl(ActuAl.messAge, expected.messAge);
	if (typeof expected.locAtion !== 'undefined') {
		Assert.strictEquAl(ActuAl.locAtion, expected.locAtion);
	} else {
		Assert.strictEquAl(ActuAl.line, expected.line);
		Assert.strictEquAl(ActuAl.chArActer, expected.chArActer);
		Assert.strictEquAl(ActuAl.endLine, expected.endLine);
		Assert.strictEquAl(ActuAl.endChArActer, expected.endChArActer);
	}
	Assert.strictEquAl(ActuAl.code, expected.code);
	Assert.strictEquAl(ActuAl.severity, expected.severity);
	Assert.strictEquAl(ActuAl.loop, expected.loop);
}

suite('TAsks version 0.1.0', () => {
	test('tAsks: All defAult', () => {
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc'
			}, builder);
	});

	test('tAsks: globAl isShellCommAnd', () => {
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				isShellCommAnd: true
			},
			builder);
	});

	test('tAsks: globAl show output silent', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			presentAtion().reveAl(TAsks.ReveAlKind.Silent);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				showOutput: 'silent'
			},
			builder
		);
	});

	test('tAsks: globAl promptOnClose defAult', () => {
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				promptOnClose: true
			},
			builder
		);
	});

	test('tAsks: globAl promptOnClose', () => {
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			promptOnClose(fAlse).
			commAnd().suppressTAskNAme(true);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				promptOnClose: fAlse
			},
			builder
		);
	});

	test('tAsks: globAl promptOnClose defAult wAtching', () => {
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			isBAckground(true).
			promptOnClose(fAlse).
			commAnd().suppressTAskNAme(true);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				isWAtching: true
			},
			builder
		);
	});

	test('tAsks: globAl show output never', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			presentAtion().reveAl(TAsks.ReveAlKind.Never);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				showOutput: 'never'
			},
			builder
		);
	});

	test('tAsks: globAl echo CommAnd', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			presentAtion().
			echo(true);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				echoCommAnd: true
			},
			builder
		);
	});

	test('tAsks: globAl Args', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			Args(['--p']);
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				Args: [
					'--p'
				]
			},
			builder
		);
	});

	test('tAsks: options - cwd', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			options({
				cwd: 'myPAth'
			});
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				options: {
					cwd: 'myPAth'
				}
			},
			builder
		);
	});

	test('tAsks: options - env', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			options({ cwd: '${workspAceFolder}', env: { key: 'vAlue' } });
		testConfigurAtion(
			{
				version: '0.1.0',
				commAnd: 'tsc',
				options: {
					env: {
						key: 'vAlue'
					}
				}
			},
			builder
		);
	});

	test('tAsks: os windows', () => {
		let nAme: string = PlAtform.isWindows ? 'tsc.win' : 'tsc';
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk(nAme, nAme).
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true);
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			windows: {
				commAnd: 'tsc.win'
			}
		};
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: os windows & globAl isShellCommAnd', () => {
		let nAme: string = PlAtform.isWindows ? 'tsc.win' : 'tsc';
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk(nAme, nAme).
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell);
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			isShellCommAnd: true,
			windows: {
				commAnd: 'tsc.win'
			}
		};
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: os mAc', () => {
		let nAme: string = PlAtform.isMAcintosh ? 'tsc.osx' : 'tsc';
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk(nAme, nAme).
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true);
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			osx: {
				commAnd: 'tsc.osx'
			}
		};
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: os linux', () => {
		let nAme: string = PlAtform.isLinux ? 'tsc.linux' : 'tsc';
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk(nAme, nAme).
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true);
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			linux: {
				commAnd: 'tsc.linux'
			}
		};
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: overwrite showOutput', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			presentAtion().reveAl(PlAtform.isWindows ? TAsks.ReveAlKind.AlwAys : TAsks.ReveAlKind.Never);
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			showOutput: 'never',
			windows: {
				showOutput: 'AlwAys'
			}
		};
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: overwrite echo CommAnd', () => {
		let builder = new ConfiguAtionBuilder();
		builder.
			tAsk('tsc', 'tsc').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			presentAtion().
			echo(PlAtform.isWindows ? fAlse : true);
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			echoCommAnd: true,
			windows: {
				echoCommAnd: fAlse
			}
		};
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: globAl problemMAtcher one', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			problemMAtcher: '$msCompile'
		};
		testDefAultProblemMAtcher(externAl, 1);
	});

	test('tAsks: globAl problemMAtcher two', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			problemMAtcher: ['$eslint-compAct', '$msCompile']
		};
		testDefAultProblemMAtcher(externAl, 2);
	});

	test('tAsks: tAsk definition', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: build tAsk', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					isBuildCommAnd: true
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').group(TAsks.TAskGroup.Build).commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: defAult build tAsk', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'build'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('build', 'tsc').group(TAsks.TAskGroup.Build).commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: test tAsk', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					isTestCommAnd: true
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').group(TAsks.TAskGroup.Test).commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: defAult test tAsk', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'test'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('test', 'tsc').group(TAsks.TAskGroup.Test).commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: tAsk with vAlues', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'test',
					showOutput: 'never',
					echoCommAnd: true,
					Args: ['--p'],
					isWAtching: true
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('test', 'tsc').
			group(TAsks.TAskGroup.Test).
			isBAckground(true).
			promptOnClose(fAlse).
			commAnd().Args(['$nAme', '--p']).
			presentAtion().
			echo(true).reveAl(TAsks.ReveAlKind.Never);

		testConfigurAtion(externAl, builder);
	});

	test('tAsks: tAsk inherits globAl vAlues', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			showOutput: 'never',
			echoCommAnd: true,
			tAsks: [
				{
					tAskNAme: 'test'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('test', 'tsc').
			group(TAsks.TAskGroup.Test).
			commAnd().Args(['$nAme']).presentAtion().
			echo(true).reveAl(TAsks.ReveAlKind.Never);

		testConfigurAtion(externAl, builder);
	});

	test('tAsks: problem mAtcher defAult', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					problemMAtcher: {
						pAttern: {
							regexp: 'Abc'
						}
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().Args(['$nAme']).pArent.
			problemMAtcher().pAttern(/Abc/);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: problem mAtcher .* regulAr expression', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					problemMAtcher: {
						pAttern: {
							regexp: '.*'
						}
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().Args(['$nAme']).pArent.
			problemMAtcher().pAttern(/.*/);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: problem mAtcher owner, ApplyTo, severity And fileLocAtion', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					problemMAtcher: {
						owner: 'myOwner',
						ApplyTo: 'closedDocuments',
						severity: 'wArning',
						fileLocAtion: 'Absolute',
						pAttern: {
							regexp: 'Abc'
						}
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().Args(['$nAme']).pArent.
			problemMAtcher().
			owner('myOwner').
			ApplyTo(ApplyToKind.closedDocuments).
			severity(Severity.WArning).
			fileLocAtion(FileLocAtionKind.Absolute).
			filePrefix(undefined!).
			pAttern(/Abc/);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: problem mAtcher fileLocAtion And filePrefix', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					problemMAtcher: {
						fileLocAtion: ['relAtive', 'myPAth'],
						pAttern: {
							regexp: 'Abc'
						}
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().Args(['$nAme']).pArent.
			problemMAtcher().
			fileLocAtion(FileLocAtionKind.RelAtive).
			filePrefix('myPAth').
			pAttern(/Abc/);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: problem pAttern locAtion', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					problemMAtcher: {
						pAttern: {
							regexp: 'Abc',
							file: 10,
							messAge: 11,
							locAtion: 12,
							severity: 13,
							code: 14
						}
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().Args(['$nAme']).pArent.
			problemMAtcher().
			pAttern(/Abc/).file(10).messAge(11).locAtion(12).severity(13).code(14);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: problem pAttern line & column', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					problemMAtcher: {
						pAttern: {
							regexp: 'Abc',
							file: 10,
							messAge: 11,
							line: 12,
							column: 13,
							endLine: 14,
							endColumn: 15,
							severity: 16,
							code: 17
						}
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().Args(['$nAme']).pArent.
			problemMAtcher().
			pAttern(/Abc/).file(10).messAge(11).
			line(12).chArActer(13).endLine(14).endChArActer(15).
			severity(16).code(17);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: prompt on close defAult', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			promptOnClose(true).
			commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: prompt on close wAtching', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					isWAtching: true
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			isBAckground(true).promptOnClose(fAlse).
			commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: prompt on close set', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					promptOnClose: fAlse
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			promptOnClose(fAlse).
			commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: tAsk selector set', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAskSelector: '/t:',
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().
			tAskSelector('/t:').
			Args(['/t:tAskNAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: suppress tAsk nAme set', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			suppressTAskNAme: fAlse,
			tAsks: [
				{
					tAskNAme: 'tAskNAme',
					suppressTAskNAme: true
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().suppressTAskNAme(true);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: suppress tAsk nAme inherit', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			suppressTAskNAme: true,
			tAsks: [
				{
					tAskNAme: 'tAskNAme'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAme', 'tsc').
			commAnd().suppressTAskNAme(true);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: two tAsks', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne'
				},
				{
					tAskNAme: 'tAskNAmeTwo'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').
			commAnd().Args(['$nAme']);
		builder.tAsk('tAskNAmeTwo', 'tsc').
			commAnd().Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: with commAnd', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					commAnd: 'tsc'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').commAnd().suppressTAskNAme(true);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: two tAsks with commAnd', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					commAnd: 'tsc'
				},
				{
					tAskNAme: 'tAskNAmeTwo',
					commAnd: 'dir'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').commAnd().suppressTAskNAme(true);
		builder.tAsk('tAskNAmeTwo', 'dir').commAnd().suppressTAskNAme(true);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: with commAnd And Args', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					commAnd: 'tsc',
					isShellCommAnd: true,
					Args: ['Arg'],
					options: {
						cwd: 'cwd',
						env: {
							env: 'env'
						}
					}
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).Args(['Arg']).options({ cwd: 'cwd', env: { env: 'env' } });
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: with commAnd os specific', () => {
		let nAme: string = PlAtform.isWindows ? 'tsc.win' : 'tsc';
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					commAnd: 'tsc',
					windows: {
						commAnd: 'tsc.win'
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', nAme).commAnd().suppressTAskNAme(true);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: with Windows specific Args', () => {
		let Args: string[] = PlAtform.isWindows ? ['Arg1', 'Arg2'] : ['Arg1'];
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			tAsks: [
				{
					tAskNAme: 'tsc',
					commAnd: 'tsc',
					Args: ['Arg1'],
					windows: {
						Args: ['Arg2']
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').commAnd().suppressTAskNAme(true).Args(Args);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: with Linux specific Args', () => {
		let Args: string[] = PlAtform.isLinux ? ['Arg1', 'Arg2'] : ['Arg1'];
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			tAsks: [
				{
					tAskNAme: 'tsc',
					commAnd: 'tsc',
					Args: ['Arg1'],
					linux: {
						Args: ['Arg2']
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tsc', 'tsc').commAnd().suppressTAskNAme(true).Args(Args);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: globAl commAnd And tAsk commAnd properties', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					isShellCommAnd: true,
				} As CustomTAsk
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').commAnd().runtime(TAsks.RuntimeType.Shell).Args(['$nAme']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: globAl And tAsks Args', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			Args: ['globAl'],
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					Args: ['locAl']
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').commAnd().Args(['globAl', '$nAme', 'locAl']);
		testConfigurAtion(externAl, builder);
	});

	test('tAsks: globAl And tAsks Args with tAsk selector', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			commAnd: 'tsc',
			Args: ['globAl'],
			tAskSelector: '/t:',
			tAsks: [
				{
					tAskNAme: 'tAskNAmeOne',
					Args: ['locAl']
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('tAskNAmeOne', 'tsc').commAnd().tAskSelector('/t:').Args(['globAl', '/t:tAskNAmeOne', 'locAl']);
		testConfigurAtion(externAl, builder);
	});
});

suite('TAsks version 2.0.0', () => {
	test('Build workspAce tAsk', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			tAsks: [
				{
					tAskNAme: 'dir',
					commAnd: 'dir',
					type: 'shell',
					group: 'build'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('GlobAl group none', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			commAnd: 'dir',
			type: 'shell',
			group: 'none'
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('GlobAl group build', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			commAnd: 'dir',
			type: 'shell',
			group: 'build'
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('GlobAl group defAult build', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			commAnd: 'dir',
			type: 'shell',
			group: { kind: 'build', isDefAult: true }
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			group(TAsks.TAskGroup.Build).
			groupType(TAsks.GroupType.defAult).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('LocAl group none', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			tAsks: [
				{
					tAskNAme: 'dir',
					commAnd: 'dir',
					type: 'shell',
					group: 'none'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('LocAl group build', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			tAsks: [
				{
					tAskNAme: 'dir',
					commAnd: 'dir',
					type: 'shell',
					group: 'build'
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('LocAl group defAult build', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			tAsks: [
				{
					tAskNAme: 'dir',
					commAnd: 'dir',
					type: 'shell',
					group: { kind: 'build', isDefAult: true }
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('dir', 'dir').
			group(TAsks.TAskGroup.Build).
			groupType(TAsks.GroupType.defAult).
			commAnd().suppressTAskNAme(true).
			runtime(TAsks.RuntimeType.Shell).
			presentAtion().echo(true);
		testConfigurAtion(externAl, builder);
	});
	test('Arg overwrite', () => {
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '2.0.0',
			tAsks: [
				{
					lAbel: 'echo',
					type: 'shell',
					commAnd: 'echo',
					Args: [
						'globAl'
					],
					windows: {
						Args: [
							'windows'
						]
					},
					linux: {
						Args: [
							'linux'
						]
					},
					osx: {
						Args: [
							'osx'
						]
					}
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		if (PlAtform.isWindows) {
			builder.tAsk('echo', 'echo').
				commAnd().suppressTAskNAme(true).Args(['windows']).
				runtime(TAsks.RuntimeType.Shell).
				presentAtion().echo(true);
			testConfigurAtion(externAl, builder);
		} else if (PlAtform.isLinux) {
			builder.tAsk('echo', 'echo').
				commAnd().suppressTAskNAme(true).Args(['linux']).
				runtime(TAsks.RuntimeType.Shell).
				presentAtion().echo(true);
			testConfigurAtion(externAl, builder);
		} else if (PlAtform.isMAcintosh) {
			builder.tAsk('echo', 'echo').
				commAnd().suppressTAskNAme(true).Args(['osx']).
				runtime(TAsks.RuntimeType.Shell).
				presentAtion().echo(true);
			testConfigurAtion(externAl, builder);
		}
	});
});

suite('Bugs / regression tests', () => {
	test('Bug 19548', () => {
		if (PlAtform.isLinux) {
			return;
		}
		let externAl: ExternAlTAskRunnerConfigurAtion = {
			version: '0.1.0',
			windows: {
				commAnd: 'powershell',
				options: {
					cwd: '${workspAceFolder}'
				},
				tAsks: [
					{
						tAskNAme: 'composeForDebug',
						suppressTAskNAme: true,
						Args: [
							'-ExecutionPolicy',
							'RemoteSigned',
							'.\\dockerTAsk.ps1',
							'-ComposeForDebug',
							'-Environment',
							'debug'
						],
						isBuildCommAnd: fAlse,
						showOutput: 'AlwAys',
						echoCommAnd: true
					} As CustomTAsk
				]
			},
			osx: {
				commAnd: '/bin/bAsh',
				options: {
					cwd: '${workspAceFolder}'
				},
				tAsks: [
					{
						tAskNAme: 'composeForDebug',
						suppressTAskNAme: true,
						Args: [
							'-c',
							'./dockerTAsk.sh composeForDebug debug'
						],
						isBuildCommAnd: fAlse,
						showOutput: 'AlwAys'
					} As CustomTAsk
				]
			}
		};
		let builder = new ConfiguAtionBuilder();
		if (PlAtform.isWindows) {
			builder.tAsk('composeForDebug', 'powershell').
				commAnd().suppressTAskNAme(true).
				Args(['-ExecutionPolicy', 'RemoteSigned', '.\\dockerTAsk.ps1', '-ComposeForDebug', '-Environment', 'debug']).
				options({ cwd: '${workspAceFolder}' }).
				presentAtion().echo(true).reveAl(TAsks.ReveAlKind.AlwAys);
			testConfigurAtion(externAl, builder);
		} else if (PlAtform.isMAcintosh) {
			builder.tAsk('composeForDebug', '/bin/bAsh').
				commAnd().suppressTAskNAme(true).
				Args(['-c', './dockerTAsk.sh composeForDebug debug']).
				options({ cwd: '${workspAceFolder}' }).
				presentAtion().reveAl(TAsks.ReveAlKind.AlwAys);
			testConfigurAtion(externAl, builder);
		}
	});

	test('Bug 28489', () => {
		let externAl = {
			version: '0.1.0',
			commAnd: '',
			isShellCommAnd: true,
			Args: [''],
			showOutput: 'AlwAys',
			'tAsks': [
				{
					tAskNAme: 'build',
					commAnd: 'bAsh',
					Args: [
						'build.sh'
					]
				}
			]
		};
		let builder = new ConfiguAtionBuilder();
		builder.tAsk('build', 'bAsh').
			group(TAsks.TAskGroup.Build).
			commAnd().suppressTAskNAme(true).
			Args(['build.sh']).
			runtime(TAsks.RuntimeType.Shell);
		testConfigurAtion(externAl, builder);
	});
});
