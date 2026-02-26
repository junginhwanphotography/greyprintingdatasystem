import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function PaperBrandsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filmTypeId: string; filmName: string; formatName: string; lensName: string; cameraName: string }>();
  const filmTypeId = Number(params.filmTypeId);
  const utils = trpc.useUtils();

  const { data: brands = [], isLoading } = trpc.paperBrands.list.useQuery({ filmTypeId });
  const createMutation = trpc.paperBrands.create.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });
  const deleteMutation = trpc.paperBrands.delete.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });
  const updateMutation = trpc.paperBrands.update.useMutation({ onSuccess: () => utils.paperBrands.list.invalidate() });

  return (
    <HierarchyListScreen
      title="인화지 브랜드"
      breadcrumb={[params.cameraName, params.lensName, params.formatName, params.filmName]}
      items={brands}
      isLoading={isLoading}
      onItemPress={(item) =>
        router.push({
          pathname: "/paper-types",
          params: {
            paperBrandId: item.id,
            brandName: item.name,
            filmName: params.filmName,
            formatName: params.formatName,
            lensName: params.lensName,
            cameraName: params.cameraName,
          },
        })
      }
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description, filmTypeId }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="인화지 브랜드가 없습니다"
    />
  );
}
