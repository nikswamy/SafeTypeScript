// Modified by N.Swamy (2014)
///<reference path='ICancellationToken.ts' />

interface ICancellationTokenSource {
    token(): ICancellationToken;

    cancel(): void;
}