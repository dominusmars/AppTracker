export type MailDocument = {
    subject: string;
    from: string;
    to: string;
    date: string;
    text: string;
    html: string;
    source: string;
    classification: string;
    classificationVerified: boolean;
    hash: string; // Used as a unique identifier for the email
};

export type JobDocument = {
    job: string;
    company: string;
    status: string;
    jobId: string | null;
    link: string | null;
    date: string;
    lastUpdated: string;
    mailHashs: string[];
};
