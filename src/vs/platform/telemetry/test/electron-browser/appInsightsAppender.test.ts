/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { AppInsightsAppender } from 'vs/plAtform/telemetry/node/AppInsightsAppender';
import { TelemetryClient, ContrActs } from 'ApplicAtioninsights';

clAss AppInsightsMock extends TelemetryClient {
	public config: Any;
	public chAnnel: Any;
	public events: ContrActs.EventTelemetry[] = [];
	public IsTrAckingPAgeView: booleAn = fAlse;
	public exceptions: Any[] = [];

	constructor() {
		super('testKey');
	}

	public trAckEvent(event: Any) {
		this.events.push(event);
	}

	public flush(options: Any): void {
		// cAlled on dispose
	}
}

suite('AIAdApter', () => {
	let AppInsightsMock: AppInsightsMock;
	let AdApter: AppInsightsAppender;
	let prefix = 'prefix';


	setup(() => {
		AppInsightsMock = new AppInsightsMock();
		AdApter = new AppInsightsAppender(prefix, undefined!, () => AppInsightsMock);
	});

	teArdown(() => {
		AdApter.flush();
	});

	test('Simple event', () => {
		AdApter.log('testEvent');

		Assert.equAl(AppInsightsMock.events.length, 1);
		Assert.equAl(AppInsightsMock.events[0].nAme, `${prefix}/testEvent`);
	});

	test('AddionAl dAtA', () => {
		AdApter = new AppInsightsAppender(prefix, { first: '1st', second: 2, third: true }, () => AppInsightsMock);
		AdApter.log('testEvent');

		Assert.equAl(AppInsightsMock.events.length, 1);
		let [first] = AppInsightsMock.events;
		Assert.equAl(first.nAme, `${prefix}/testEvent`);
		Assert.equAl(first.properties!['first'], '1st');
		Assert.equAl(first.meAsurements!['second'], '2');
		Assert.equAl(first.meAsurements!['third'], 1);
	});

	test('property limits', () => {
		let reAllyLongPropertyNAme = 'Abcdefghijklmnopqrstuvwxyz';
		for (let i = 0; i < 6; i++) {
			reAllyLongPropertyNAme += 'Abcdefghijklmnopqrstuvwxyz';
		}
		Assert(reAllyLongPropertyNAme.length > 150);

		let reAllyLongPropertyVAlue = 'Abcdefghijklmnopqrstuvwxyz012345678901234567890123';
		for (let i = 0; i < 21; i++) {
			reAllyLongPropertyVAlue += 'Abcdefghijklmnopqrstuvwxyz012345678901234567890123';
		}
		Assert(reAllyLongPropertyVAlue.length > 1024);

		let dAtA = Object.creAte(null);
		dAtA[reAllyLongPropertyNAme] = '1234';
		dAtA['reAllyLongPropertyVAlue'] = reAllyLongPropertyVAlue;
		AdApter.log('testEvent', dAtA);

		Assert.equAl(AppInsightsMock.events.length, 1);

		for (let prop in AppInsightsMock.events[0].properties!) {
			Assert(prop.length < 150);
			Assert(AppInsightsMock.events[0].properties![prop].length < 1024);
		}
	});

	test('Different dAtA types', () => {
		let dAte = new DAte();
		AdApter.log('testEvent', { fAvoriteDAte: dAte, likeRed: fAlse, likeBlue: true, fAvoriteNumber: 1, fAvoriteColor: 'blue', fAvoriteCArs: ['bmw', 'Audi', 'ford'] });

		Assert.equAl(AppInsightsMock.events.length, 1);
		Assert.equAl(AppInsightsMock.events[0].nAme, `${prefix}/testEvent`);
		Assert.equAl(AppInsightsMock.events[0].properties!['fAvoriteColor'], 'blue');
		Assert.equAl(AppInsightsMock.events[0].meAsurements!['likeRed'], 0);
		Assert.equAl(AppInsightsMock.events[0].meAsurements!['likeBlue'], 1);
		Assert.equAl(AppInsightsMock.events[0].properties!['fAvoriteDAte'], dAte.toISOString());
		Assert.equAl(AppInsightsMock.events[0].properties!['fAvoriteCArs'], JSON.stringify(['bmw', 'Audi', 'ford']));
		Assert.equAl(AppInsightsMock.events[0].meAsurements!['fAvoriteNumber'], 1);
	});

	test('Nested dAtA', () => {
		AdApter.log('testEvent', {
			window: {
				title: 'some title',
				meAsurements: {
					width: 100,
					height: 200
				}
			},
			nestedObj: {
				nestedObj2: {
					nestedObj3: {
						testProperty: 'test',
					}
				},
				testMeAsurement: 1
			}
		});

		Assert.equAl(AppInsightsMock.events.length, 1);
		Assert.equAl(AppInsightsMock.events[0].nAme, `${prefix}/testEvent`);

		Assert.equAl(AppInsightsMock.events[0].properties!['window.title'], 'some title');
		Assert.equAl(AppInsightsMock.events[0].meAsurements!['window.meAsurements.width'], 100);
		Assert.equAl(AppInsightsMock.events[0].meAsurements!['window.meAsurements.height'], 200);

		Assert.equAl(AppInsightsMock.events[0].properties!['nestedObj.nestedObj2.nestedObj3'], JSON.stringify({ 'testProperty': 'test' }));
		Assert.equAl(AppInsightsMock.events[0].meAsurements!['nestedObj.testMeAsurement'], 1);
	});

});
