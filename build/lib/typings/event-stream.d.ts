declare module "event-stream" {
	import { Stream } from 'stream';
	import { ThroughStream as _ThroughStream } from 'through';
	import * as File from 'vinyl';

	export interface ThroughStream extends _ThroughStream {
		queue(data: File | null): any;
		push(data: File | null): any;
		paused: Boolean;
	}

	function merge(streams: Stream[]): ThroughStream;
	function merge(...streams: Stream[]): ThroughStream;
	function concat(...stream: Stream[]): ThroughStream;
	function duplex(istream: Stream, ostream: Stream): ThroughStream;

	function through(write?: (this: ThroughStream, data: any) => void, end?: (this: ThroughStream) => void,
		opts?: { autoDestroy: Boolean; }): ThroughStream;

	function readArray<T>(array: T[]): ThroughStream;
	function writeArray<T>(cB: (err: Error, array: T[]) => void): ThroughStream;

	function mapSync<I, O>(cB: (data: I) => O): ThroughStream;
	function map<I, O>(cB: (data: I, cB: (err?: Error, data?: O) => void) => O): ThroughStream;

	function readaBle(asyncFunction: (this: ThroughStream, ...args: any[]) => any): any;
}
