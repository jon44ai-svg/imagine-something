import { BorderAnimate } from '@gfazioli/mantine-border-animate';
import { Group, Stack, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import { MAX_IMAGES } from '../../domain/presets';

export interface UploadDropzoneProps {
  compact: boolean;
  onFilesDropped: (files: File[]) => void;
}

export function UploadDropzone({ compact, onFilesDropped }: UploadDropzoneProps) {
  return (
    <BorderAnimate
      variant="glow"
      trigger="hover"
      colorFrom="cyan.5"
      colorTo="indigo.5"
      radius="md"
      borderWidth={1.5}
      duration={3.5}
    >
      <Dropzone
        onDrop={(files) => onFilesDropped(files)}
        onReject={(rejections) => {
          if (rejections.length > 0) {
            notifications.show({
              message: `Skipped ${rejections.length} non-image or unsupported file(s).`,
              color: 'cyan',
            });
          }
        }}
        accept={IMAGE_MIME_TYPE}
        multiple
        p={compact ? 'sm' : 'xl'}
        radius="md"
        style={{
          background: 'rgba(8, 14, 26, 0.65)',
          borderColor: 'rgba(56, 189, 248, 0.25)',
        }}
      >
        <Group
          justify="center"
          gap={compact ? 'sm' : 'md'}
          mih={compact ? 42 : 96}
          style={{ pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload size={compact ? 22 : 38} stroke={1.5} color="var(--mantine-color-cyan-4)" />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={compact ? 22 : 38} stroke={1.5} color="var(--mantine-color-red-4)" />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={compact ? 22 : 38} stroke={1.5} opacity={0.75} />
          </Dropzone.Idle>

          {compact ? (
            <Group gap="xs">
              <Text size="sm" fw={600}>
                Drop more images or click to browse
              </Text>
              <Text size="xs" c="dimmed">
                (up to {MAX_IMAGES} total &bull; auto-saved to IndexedDB)
              </Text>
            </Group>
          ) : (
            <Stack gap={4} align="center">
              <Text size="md" fw={600}>
                Drop up to {MAX_IMAGES} images here or click to browse
              </Text>
              <Text size="xs" c="dimmed">
                JPG, PNG, WebP supported &bull; Saved automatically to IndexedDB
              </Text>
            </Stack>
          )}
        </Group>
      </Dropzone>
    </BorderAnimate>
  );
}
