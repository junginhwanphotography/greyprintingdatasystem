import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function FormatsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lensGroupId: string; lensName: string; cameraName: string }>();
  const lensGroupId = Number(params.lensGroupId);
  const utils = trpc.useUtils();

  const { data: fmts = [], isLoading } = trpc.formats.list.useQuery({ lensGroupId });
  const createMutation = trpc.formats.create.useMutation({ onSuccess: () => utils.formats.list.invalidate() });
  const deleteMutation = trpc.formats.delete.useMutation({ onSuccess: () => utils.formats.list.invalidate() });
  const updateMutation = trpc.formats.update.useMutation({ onSuccess: () => utils.formats.list.invalidate() });

  return (
    <HierarchyListScreen
      title="판형"
      breadcrumb={[params.cameraName, params.lensName]}
      items={fmts}
      isLoading={isLoading}
      onItemPress={(item) =>
        router.push({
          pathname: "/film-types",
          params: {
            formatId: item.id,
            formatName: item.name,
            lensName: params.lensName,
            cameraName: params.cameraName,
          },
        })
      }
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description, lensGroupId }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="판형이 없습니다"
    />
  );
}
