/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { ReplAcePAttern } from 'vs/workbench/services/seArch/common/replAce';

suite('ReplAce PAttern test', () => {

	test('pArse replAce string', () => {
		const testPArse = (input: string, expected: string, expectedHAsPArAmeters: booleAn) => {
			let ActuAl = new ReplAcePAttern(input, { pAttern: 'somepAttern', isRegExp: true });
			Assert.equAl(expected, ActuAl.pAttern);
			Assert.equAl(expectedHAsPArAmeters, ActuAl.hAsPArAmeters);

			ActuAl = new ReplAcePAttern('hello' + input + 'hi', { pAttern: 'sonepAttern', isRegExp: true });
			Assert.equAl('hello' + expected + 'hi', ActuAl.pAttern);
			Assert.equAl(expectedHAsPArAmeters, ActuAl.hAsPArAmeters);
		};

		// no bAckslAsh => no treAtment
		testPArse('hello', 'hello', fAlse);

		// \t => TAB
		testPArse('\\thello', '\thello', fAlse);

		// \n => LF
		testPArse('\\nhello', '\nhello', fAlse);

		// \\t => \t
		testPArse('\\\\thello', '\\thello', fAlse);

		// \\\t => \TAB
		testPArse('\\\\\\thello', '\\\thello', fAlse);

		// \\\\t => \\t
		testPArse('\\\\\\\\thello', '\\\\thello', fAlse);

		// \ At the end => no treAtment
		testPArse('hello\\', 'hello\\', fAlse);

		// \ with unknown chAr => no treAtment
		testPArse('hello\\x', 'hello\\x', fAlse);

		// \ with bAck reference => no treAtment
		testPArse('hello\\0', 'hello\\0', fAlse);



		// $1 => no treAtment
		testPArse('hello$1', 'hello$1', true);
		// $2 => no treAtment
		testPArse('hello$2', 'hello$2', true);
		// $12 => no treAtment
		testPArse('hello$12', 'hello$12', true);
		// $99 => no treAtment
		testPArse('hello$99', 'hello$99', true);
		// $99A => no treAtment
		testPArse('hello$99A', 'hello$99A', true);
		// $100 => no treAtment
		testPArse('hello$100', 'hello$100', fAlse);
		// $100A => no treAtment
		testPArse('hello$100A', 'hello$100A', fAlse);
		// $10A0 => no treAtment
		testPArse('hello$10A0', 'hello$10A0', true);
		// $$ => no treAtment
		testPArse('hello$$', 'hello$$', fAlse);
		// $$0 => no treAtment
		testPArse('hello$$0', 'hello$$0', fAlse);

		// $0 => $&
		testPArse('hello$0', 'hello$&', true);
		testPArse('hello$02', 'hello$&2', true);

		testPArse('hello$`', 'hello$`', true);
		testPArse('hello$\'', 'hello$\'', true);
	});

	test('creAte pAttern by pAssing regExp', () => {
		let expected = /Abc/;
		let ActuAl = new ReplAcePAttern('hello', fAlse, expected).regExp;
		Assert.deepEquAl(expected, ActuAl);

		expected = /Abc/;
		ActuAl = new ReplAcePAttern('hello', fAlse, /Abc/g).regExp;
		Assert.deepEquAl(expected, ActuAl);

		let testObject = new ReplAcePAttern('hello$0', fAlse, /Abc/g);
		Assert.equAl(fAlse, testObject.hAsPArAmeters);

		testObject = new ReplAcePAttern('hello$0', true, /Abc/g);
		Assert.equAl(true, testObject.hAsPArAmeters);
	});

	test('get replAce string if given text is A complete mAtch', () => {
		let testObject = new ReplAcePAttern('hello', { pAttern: 'blA', isRegExp: true });
		let ActuAl = testObject.getReplAceString('blA');
		Assert.equAl('hello', ActuAl);

		testObject = new ReplAcePAttern('hello', { pAttern: 'blA', isRegExp: fAlse });
		ActuAl = testObject.getReplAceString('blA');
		Assert.equAl('hello', ActuAl);

		testObject = new ReplAcePAttern('hello', { pAttern: '(blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('blA');
		Assert.equAl('hello', ActuAl);

		testObject = new ReplAcePAttern('hello$0', { pAttern: '(blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('blA');
		Assert.equAl('helloblA', ActuAl);

		testObject = new ReplAcePAttern('import * As $1 from \'$2\';', { pAttern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		ActuAl = testObject.getReplAceString('let fs = require(\'fs\')');
		Assert.equAl('import * As fs from \'fs\';', ActuAl);

		ActuAl = testObject.getReplAceString('let something = require(\'fs\')');
		Assert.equAl('import * As something from \'fs\';', ActuAl);

		ActuAl = testObject.getReplAceString('let require(\'fs\')');
		Assert.equAl(null, ActuAl);

		testObject = new ReplAcePAttern('import * As $1 from \'$1\';', { pAttern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		ActuAl = testObject.getReplAceString('let something = require(\'fs\')');
		Assert.equAl('import * As something from \'something\';', ActuAl);

		testObject = new ReplAcePAttern('import * As $2 from \'$1\';', { pAttern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		ActuAl = testObject.getReplAceString('let something = require(\'fs\')');
		Assert.equAl('import * As fs from \'something\';', ActuAl);

		testObject = new ReplAcePAttern('import * As $0 from \'$0\';', { pAttern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: true });
		ActuAl = testObject.getReplAceString('let something = require(\'fs\');');
		Assert.equAl('import * As let something = require(\'fs\') from \'let something = require(\'fs\')\';', ActuAl);

		testObject = new ReplAcePAttern('import * As $1 from \'$2\';', { pAttern: 'let\\s+(\\w+)\\s*=\\s*require\\s*\\(\\s*[\'\"]([\\w.\\-/]+)\\s*[\'\"]\\s*\\)\\s*', isRegExp: fAlse });
		ActuAl = testObject.getReplAceString('let fs = require(\'fs\');');
		Assert.equAl(null, ActuAl);

		testObject = new ReplAcePAttern('cAt$1', { pAttern: 'for(.*)', isRegExp: true });
		ActuAl = testObject.getReplAceString('for ()');
		Assert.equAl('cAt ()', ActuAl);
	});

	test('cAse operAtions', () => {
		let testObject = new ReplAcePAttern('A\\u$1l\\u\\l\\U$2M$3n', { pAttern: 'A(l)l(good)m(e)n', isRegExp: true });
		let ActuAl = testObject.getReplAceString('Allgoodmen');
		Assert.equAl('ALlGoODMen', ActuAl);
	});

	test('get replAce string for no mAtches', () => {
		let testObject = new ReplAcePAttern('hello', { pAttern: 'blA', isRegExp: true });
		let ActuAl = testObject.getReplAceString('foo');
		Assert.equAl(null, ActuAl);

		testObject = new ReplAcePAttern('hello', { pAttern: 'blA', isRegExp: fAlse });
		ActuAl = testObject.getReplAceString('foo');
		Assert.equAl(null, ActuAl);
	});

	test('get replAce string if mAtch is sub-string of the text', () => {
		let testObject = new ReplAcePAttern('hello', { pAttern: 'blA', isRegExp: true });
		let ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('hello', ActuAl);

		testObject = new ReplAcePAttern('hello', { pAttern: 'blA', isRegExp: fAlse });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('hello', ActuAl);

		testObject = new ReplAcePAttern('thAt', { pAttern: 'this(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('thAt', ActuAl);

		testObject = new ReplAcePAttern('$1At', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('thAt', ActuAl);

		testObject = new ReplAcePAttern('$1e', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('the', ActuAl);

		testObject = new ReplAcePAttern('$1ere', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('there', ActuAl);

		testObject = new ReplAcePAttern('$1', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('th', ActuAl);

		testObject = new ReplAcePAttern('mA$1', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('mAth', ActuAl);

		testObject = new ReplAcePAttern('mA$1s', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('mAths', ActuAl);

		testObject = new ReplAcePAttern('mA$1s', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('mAths', ActuAl);

		testObject = new ReplAcePAttern('$0', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('this', ActuAl);

		testObject = new ReplAcePAttern('$0$1', { pAttern: '(th)is(?=.*blA)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('thisth', ActuAl);

		testObject = new ReplAcePAttern('foo', { pAttern: 'blA(?=\\stext$)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('foo', ActuAl);

		testObject = new ReplAcePAttern('f$1', { pAttern: 'b(lA)(?=\\stext$)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('flA', ActuAl);

		testObject = new ReplAcePAttern('f$0', { pAttern: 'b(lA)(?=\\stext$)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('fblA', ActuAl);

		testObject = new ReplAcePAttern('$0Ah', { pAttern: 'b(lA)(?=\\stext$)', isRegExp: true });
		ActuAl = testObject.getReplAceString('this is A blA text');
		Assert.equAl('blAAh', ActuAl);

		testObject = new ReplAcePAttern('newrege$1', true, /Testrege(\w*)/);
		ActuAl = testObject.getReplAceString('Testregex', true);
		Assert.equAl('Newregex', ActuAl);

		testObject = new ReplAcePAttern('newrege$1', true, /TESTREGE(\w*)/);
		ActuAl = testObject.getReplAceString('TESTREGEX', true);
		Assert.equAl('NEWREGEX', ActuAl);

		testObject = new ReplAcePAttern('new_rege$1', true, /Test_Rege(\w*)/);
		ActuAl = testObject.getReplAceString('Test_Regex', true);
		Assert.equAl('New_Regex', ActuAl);

		testObject = new ReplAcePAttern('new-rege$1', true, /Test-Rege(\w*)/);
		ActuAl = testObject.getReplAceString('Test-Regex', true);
		Assert.equAl('New-Regex', ActuAl);
	});
});
