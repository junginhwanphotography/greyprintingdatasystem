import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function PaperSizesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ paperTypeId: string; typeName: string; brandName: string; filmName: string; formatName: string; lensName: string; cameraName: string }>();
  const paperTypeId = Number(params.paperTypeId);
  const utils = trpc.useUtils();

  const { data: sizes = [], isLoading } = trpc.paperSizes.list.useQuery({ paperTypeId });
  const createMutation = trpc.paperSizes.create.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });
  const deleteMutation = trpc.paperSizes.delete.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });
  const updateMutation = trpc.paperSizes.update.useMutation({ onSuccess: () => utils.paperSizes.list.invalidate() });

  return (
    <HierarchyListScreen
      title="인화지 사이즈"
      breadcrumb={[params.cameraName, params.lensName, params.formatName, params.filmName, params.brandName, params.typeName]}
      items={sizes}
      isLoading={isLoading}
      onItemPress={(item) =>
        router.push({
          pathname: "/print-data",
          params: {
            paperSizeId: item.id,
            sizeName: item.name,
            typeName: params.typeName,
            brandName: params.brandName,
            filmName: params.filmName,
            formatName: params.formatName,
            lensName: params.lensName,
            cameraName: params.cameraName,
          },
        })
      }
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description, paperTypeId }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="인화지 사이즈가 없습니다"
    />
  );
}
