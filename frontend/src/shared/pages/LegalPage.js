import React from 'react';

import './LegalPage.css';

const legalContent = {
  terms: {
    title: 'Terms of Use',
    updated: '26 July 2026',
    sections: [
      ['Using MyHikes', 'MyHikes lets users discover and share hiking places. You must provide accurate account information, keep your account secure, and use the service lawfully.'],
      ['Your content', 'You keep ownership of content you submit. By posting it, you allow MyHikes to display and process it as needed to operate the service. Do not upload unlawful content or content that infringes the rights of others.'],
      ['Safety and availability', 'Trail information is provided by the community and may be incomplete or outdated. Check local conditions and official guidance before a hike. The service may be changed, interrupted, or withdrawn at any time.'],
      ['Accounts and moderation', 'We may remove content or restrict accounts that misuse the service, threaten safety, or breach these terms.'],
      ['Contact', 'For questions about these terms, contact the project owner through the Portfolio link in the footer.']
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    updated: '26 July 2026',
    sections: [
      ['Information we collect', 'MyHikes may process account details such as your name and email address, profile information, hiking places and images you submit, favorites, reports, and basic technical information needed to run and secure the service.'],
      ['How we use information', 'We use this information to create and protect accounts, provide app features, display community content, send essential account emails, moderate the service, and diagnose technical problems.'],
      ['Sharing and storage', 'Public profile and hiking content can be visible to other users. Service providers may process data only where needed for hosting, email delivery, image storage, maps, or other app functions.'],
      ['Your choices', 'You can update profile information in your account. You may also request access to or deletion of your personal data by contacting the project owner.'],
      ['Contact', 'For privacy questions or requests, contact the project owner through the Portfolio link in the footer.']
    ]
  }
};

const LegalPage = ({ type }) => {
  const content = legalContent[type];

  return (
    <article className="legal-page">
      <header>
        <p className="legal-page__eyebrow">MyHikes</p>
        <h1>{content.title}</h1>
        <p className="legal-page__updated">Last updated: {content.updated}</p>
      </header>

      {content.sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
    </article>
  );
};

export default LegalPage;
