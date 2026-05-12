import urllib.request
import re

data = urllib.request.urlopen('https://developers.circle.com/openapi/developer-controlled-wallets.yaml').read().decode('utf-8')
for pattern in ['CreateTransferTransactionForDeveloperRequest', 'tokenAddress:', 'blockchain:', 'tokenBlockchain:', 'destinationAddress:', 'walletId:', 'walletAddress:']:
    print('===', pattern, '===')
    for match in re.finditer(re.escape(pattern), data):
        start = max(match.start() - 120, 0)
        end = min(match.end() + 120, len(data))
        print(data[start:end].replace('\n', '\\n'))
        print('---')
    print('\n')
