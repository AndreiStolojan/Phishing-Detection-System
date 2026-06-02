import { Box } from '@mui/material';

import LoadingState from '../common/LoadingState.jsx';
import EmailListItem from './EmailListItem.jsx';

export default function EmailList({
  emails,
  loading,
  selectedEmailId,
  onSelectEmail,
}) {
  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.paper' }}>
      {loading ? <LoadingState label="Loading email" /> : null}
      {!loading
        ? emails.map((email) => (
            <EmailListItem
              key={email._id}
              email={email}
              selected={selectedEmailId === email._id}
              onSelect={onSelectEmail}
            />
          ))
        : null}
    </Box>
  );
}
