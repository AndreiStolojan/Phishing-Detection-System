import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { Button, Stack } from '@mui/material';

export default function ReviewActions({
  onMarkSafe,
  onMarkPhishing,
  onRescan,
  loading = false,
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      <Button
        startIcon={<RefreshOutlinedIcon />}
        onClick={onRescan}
        disabled={loading}
        variant="outlined"
      >
        Rescan
      </Button>
      <Button
        startIcon={<MarkEmailReadOutlinedIcon />}
        onClick={onMarkSafe}
        disabled={loading}
        variant="outlined"
        color="success"
      >
        Mark safe
      </Button>
      <Button
        startIcon={<GppBadOutlinedIcon />}
        onClick={onMarkPhishing}
        disabled={loading}
        variant="contained"
        color="error"
      >
        Mark phishing
      </Button>
    </Stack>
  );
}
