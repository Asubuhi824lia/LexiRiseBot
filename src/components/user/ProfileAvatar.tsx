import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Avatar, Button, Popconfirm, Space, Upload } from 'antd'
import { deleteAvatar, fetchAvatarObjectUrl, uploadAvatar } from '../../api/user/avatar.ts'
import queryKeys from '../../api/queryKeys.ts'
import type { User } from '../../api/user/types.ts'

type ProfileAvatarProps = {
  user: Pick<User, 'id' | 'login' | 'hasAvatar'>
}

export function ProfileAvatar({ user }: ProfileAvatarProps) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const { data: avatarUrl } = useQuery({
    queryKey: [queryKeys.USER_AVATAR, user.id, user.hasAvatar],
    enabled: user.hasAvatar,
    queryFn: fetchAvatarObjectUrl,
    meta: { errorMessage: 'Не удалось получить аватар' },
  })

  useEffect(() => {
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl)
    }
  }, [avatarUrl])

  const { mutate: uploadAvatarMutate, isPending: isUploadAvatarPending } = useMutation({
    mutationFn: uploadAvatar,
    meta: { errorMessage: 'Не удалось загрузить аватар' },
    onSuccess: async (result) => {
      queryClient.setQueryData([queryKeys.USER], result.user)
      await queryClient.invalidateQueries({ queryKey: [queryKeys.USER_AVATAR] })
      message.success('Аватар обновлён')
    },
  })

  const { mutate: deleteAvatarMutate, isPending: isDeleteAvatarPending } = useMutation({
    mutationFn: deleteAvatar,
    meta: { errorMessage: 'Не удалось удалить аватар' },
    onSuccess: async (result) => {
      queryClient.setQueryData([queryKeys.USER], result.user)
      await queryClient.invalidateQueries({ queryKey: [queryKeys.USER_AVATAR] })
      message.success('Аватар удалён')
    },
  })

  return (
    <Space orientation="vertical" align="center">
      <Avatar size={112} src={avatarUrl || undefined} alt={user.login}>
        {user.login.slice(0, 1).toUpperCase()}
      </Avatar>
      <Upload
        accept="image/jpeg,image/png,image/webp"
        showUploadList={false}
        beforeUpload={(file) => {
          uploadAvatarMutate(file)
          return false
        }}
      >
        <Button loading={isUploadAvatarPending}>{user.hasAvatar ? 'Изменить' : 'Загрузить'}</Button>
      </Upload>
      {user.hasAvatar && (
        <Popconfirm
          title="Удалить аватар?"
          okText="Удалить"
          cancelText="Отмена"
          onConfirm={() => deleteAvatarMutate()}
        >
          <Button danger loading={isDeleteAvatarPending}>
            Удалить
          </Button>
        </Popconfirm>
      )}
    </Space>
  )
}
