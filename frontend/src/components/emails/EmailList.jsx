import { Stack } from '@mui/material';

import EmailListItem from './EmailListItem.jsx';

const EmailList = ({ emails = [] }) => {
  return (
    <Stack spacing={1.25}>
      {emails.map((email) => (
        <EmailListItem
          key={email._id}
          email={email}
        />
      ))}
    </Stack>
  );
};

export default EmailList;
