import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function PaperTypesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ paperBrandId: string; brandName: string; filmName: string; formatName: string; lensName: string; cameraName: string }>();
  const paperBrandId = Number(params.paperBrandId);
  const utils = trpc.useUtils();

  const { data: types = [], isLoading } = trpc.paperTypes.list.useQuery({ paperBrandId });
  const createMutation = trpc.paperTypes.create.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });
  const deleteMutation = trpc.paperTypes.delete.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });
  const updateMutation = trpc.paperTypes.update.useMutation({ onSuccess: () => utils.paperTypes.list.invalidate() });

  return (
    <HierarchyListScreen
      title="인화지 종류"
      breadcrumb={[params.cameraName, params.lensName, params.formatName, params.filmName, params.brandName]}
      items={types}
      isLoading={isLoading}
      onItemPress={(item) =>
        router.push({
          pathname: "/paper-sizes",
          params: {
            paperTypeId: item.id,
            typeName: item.name,
            brandName: params.brandName,
            filmName: params.filmName,
            formatName: params.formatName,
            lensName: params.lensName,
            cameraName: params.cameraName,
          },
        })
      }
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description, paperBrandId }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="인화지 종류가 없습니다"
    />
  );
}
