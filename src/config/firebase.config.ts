import * as admin from 'firebase-admin';

export const firebaseConfig: {
    token_uri: string;
    private_key_id: string;
    client_x509_cert_url: string;
    project_id: string;
    universe_domain: string;
    auth_uri: string;
    auth_provider_x509_cert_url: string;
    client_email: string;
    private_key: string;
    type: string;
    client_id: string
} = {
    type: "service_account",
    project_id: "firbaseprojectpetoman",
    private_key_id: "e727d2ee4ade0c41a929fe1a20a99554c4af7622",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGW0rPue5CAIil\nh8vamPqttejSELrN/xz1AOb/EP4gSFbD7hgL9+s+6xqk+Zl6ekEnWIaye0Cl0K3L\n2CtP/pNy6Rx8fMHJqTwU5Wn7TDY+o31RuMnthR6aZ4o+PK0sBBLYSX0x66aIBhyP\nepX6rdUBB5tcy44ulDLTMp3BqZcifj5Z2AB83fQSVqNLnDx4osVATlT3MkFAwOFA\nBK6rylw0ovQuj+jh7FaZtoz4NxtizAJqOuVBBfJIPl/XMsrEZHqQlzz4G2ZLP2my\nIMUet3gHyLIciGpe3ggyFMtDsbzeaJLJKZLe8FN7DXl+iC0f9oeGSvMlp/gmo52G\nks6kyDpnAgMBAAECggEAIbZRZDW7F0+k6dFHJdt7O3vf2pgKT8mMn91r5Sz7q/vv\ndzRntN0Jh/OIX0Kmwai2mxvSJNKK3cO2Th9q2Rkw8UZKV6QSgZY4RmrpVNMSoxnB\nSlroQuytk1uGpOZGHmWA2G7BDvN4pcS4JPCWPfk+awLidmaIP0Vjz/5ZzpjmvW8/\nkDXjgcRSXyhH2kx4cZ8UFKijxCBFthiWltxoyBvfB+T8dAfbCzananUQI1nPsACN\nV5xlPJs78ryKsOLQSita8IuL+yU5OLwuiJzcVWmbt2DCfqmTZZUdtjZ/di5RG+i2\nLMea+aMMLuPW8sI3Hq4z9uVFnDQqFHMGgZTW6atH5QKBgQDzjCxjf3+cBGIO03WO\nILinfsgyoJ2lr/8oEYhayAH+yjunl9IkSQRtngtNbQeCLdFnCdDnhq847EJiawcC\n4VJsF4cOS456XkzwSF6w7wjwdpu9NZD2/NAF3s2Dm2sWQpojnKoNgHrtYXbk/2lp\nF0Qw3B9/Jhdovs8lve9hefDNZQKBgQDQf5vIwgeLTs+WiThlRvmr20WQbB1xWRtv\nQb7oPEDoysLD0IabMPKbGfkUQazDz5UX0+NtWLHXHKdpsuERxHEf6Ha7wLyUosJX\nSZ5LhhyprLjBepBkXBoLrAYYWn5ynXceXVTP4wyKnEVfQ87SK87J4MLg9oDAqvNN\nFAb9jGyh2wKBgQCiITJ7mijtR82vaP3c+9NxTWkgquPHpP4LQoCvTm5lm2NTEjKG\njUUxZADKLkbNVosMOPCk8Hg9QKqAshccx7sC0jbKQWo79ALsAoFm7/nXel36+2nh\nwjMJdWUCs7f6PaQ3CNf73Qf4duWbVJxrpV1z2VXuYwE6baugyGxPS8oOMQKBgFaz\nyh+I+EQpCNArzeTnx+l8bIgrPW8mQ+9XIsFGVSO5NZbiPyeICksPWPHggayHxRM8\njMWq7YFrq/6bYVbXHsfLDpzzADi7Gh/cQFRdt8ujRM1IX4Use7RA2+QCtbSJ4MAi\nxaMRYuS9KWf9NaNWjk6LBd8xAsecD0MNQf7sBzyjAoGBALS0CPVxhRvW/tmzOnSv\nyYUs0UtFIPKWEClDP/tEOigEHYqXcttuwLLtVOCmoTcvzIp4ujP1qWl1D5uMNSHN\nViL7G3BV3UtklxMlI4ppbQpPeLQGFQZZ7rrqpQj59tIC1wbHnODSW4xVbS7h3CGl\nv4o6JTvDKmf8gRi9hgM4yoRK\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@firbaseprojectpetoman.iam.gserviceaccount.com",
    client_id: "113847762923063817040",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40firbaseprojectpetoman.iam.gserviceaccount.com",
    universe_domain: "googleapis.com"
};