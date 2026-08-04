import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/patterns/empty-state";
import { LoadingText } from "@/components/patterns/loading-text";
import { BackLink } from "@/components/patterns/text-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Client, ClientCreateInput } from "@/db/client";

const API_BASE = "/api/clients";

async function fetchClients() {
	const res = await fetch(API_BASE);
	if (!res.ok) throw new Error("Failed to fetch clients");
	return res.json() as Promise<{ data: Client[]; pagination: { total: number } }>;
}

async function apiCreateClient(data: ClientCreateInput) {
	const res = await fetch(API_BASE, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const body: { error?: string } = await res.json();
		throw new Error(body.error || "Failed");
	}
	return res.json() as Promise<Client>;
}

async function apiUpdateClient({ id, ...data }: { id: string } & Partial<ClientCreateInput>) {
	const res = await fetch(`${API_BASE}/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
	if (!res.ok) {
		const body: { error?: string } = await res.json();
		throw new Error(body.error || "Failed to update client");
	}
	return res.json() as Promise<Client>;
}

async function apiDeleteClient(id: string) {
	const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
	if (!res.ok) throw new Error("Failed to delete client");
}

export function ClientsPage() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingClient, setEditingClient] = useState<Client | null>(null);
	const [deletingClient, setDeletingClient] = useState<Client | null>(null);

	const { data, isLoading, error } = useQuery({
		queryKey: ["clients"],
		queryFn: fetchClients,
	});

	const createMutation = useMutation({
		mutationFn: apiCreateClient,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setDialogOpen(false);
		},
	});

	const updateMutation = useMutation({
		mutationFn: apiUpdateClient,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setEditingClient(null);
			setDialogOpen(false);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: apiDeleteClient,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["clients"] });
			setDeletingClient(null);
		},
	});

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const values = {
			name: formData.get("name") as string,
			surname: formData.get("surname") as string,
			email: formData.get("email") as string,
		};

		if (editingClient) {
			updateMutation.mutate({ id: editingClient.id, ...values });
		} else {
			createMutation.mutate(values);
		}
	}

	function openCreate() {
		setEditingClient(null);
		setDialogOpen(true);
	}

	function openEdit(client: Client) {
		setEditingClient(client);
		setDialogOpen(true);
	}

	const isMutating = createMutation.isPending || updateMutation.isPending;
	const mutationError = createMutation.error || updateMutation.error;

	return (
		<PageShell width="wide">
			<div className="space-y-4">
				<BackLink href="/">Back</BackLink>
				<PageHeader title="Clients" />
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="tabular-nums">
						{data ? `${data.pagination.total} clients` : "Clients"}
					</CardTitle>
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button size="sm" onClick={openCreate}>
								<Plus aria-hidden="true" className="size-4" />
								Add client
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{editingClient ? "Edit client" : "New client"}</DialogTitle>
							</DialogHeader>
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										name="name"
										required
										maxLength={30}
										defaultValue={editingClient?.name ?? ""}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="surname">Surname</Label>
									<Input
										id="surname"
										name="surname"
										required
										maxLength={30}
										defaultValue={editingClient?.surname ?? ""}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										name="email"
										type="email"
										required
										defaultValue={editingClient?.email ?? ""}
									/>
								</div>
								{mutationError && (
									<p className="text-destructive text-sm">{mutationError.message}</p>
								)}
								<Button type="submit" disabled={isMutating} className="w-full">
									{isMutating ? "Saving…" : editingClient ? "Update client" : "Create client"}
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				</CardHeader>
				<CardContent>
					{isLoading && <LoadingText className="py-8 text-center">Loading clients…</LoadingText>}
					{error && <p className="py-4 text-center text-destructive text-sm">{error.message}</p>}
					{data && data.data.length === 0 && (
						<EmptyState
							icon={Users}
							title="No clients yet"
							description="Add one to get started."
							action={
								<Button size="sm" onClick={openCreate}>
									<Plus aria-hidden="true" className="size-4" />
									Add client
								</Button>
							}
						/>
					)}
					{data && data.data.length > 0 && (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Surname</TableHead>
									<TableHead>Email</TableHead>
									<TableHead className="w-24" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.data.map((client) => (
									<TableRow key={client.id}>
										<TableCell>{client.name}</TableCell>
										<TableCell>{client.surname}</TableCell>
										<TableCell>{client.email}</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													aria-label={`Edit ${client.name} ${client.surname}`}
													onClick={() => openEdit(client)}
												>
													<Pencil aria-hidden="true" className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													aria-label={`Delete ${client.name} ${client.surname}`}
													onClick={() => setDeletingClient(client)}
													disabled={deleteMutation.isPending}
												>
													<Trash2 aria-hidden="true" className="size-4 text-destructive" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<DeleteClientDialog
				client={deletingClient}
				pending={deleteMutation.isPending}
				onCancel={() => setDeletingClient(null)}
				onConfirm={() => {
					if (deletingClient) deleteMutation.mutate(deletingClient.id);
				}}
			/>
		</PageShell>
	);
}

function DeleteClientDialog({
	client,
	pending,
	onCancel,
	onConfirm,
}: {
	client: Client | null;
	pending: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog
			open={client !== null}
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<DialogContent role="alertdialog">
				<DialogHeader>
					<DialogTitle>Delete client?</DialogTitle>
					<DialogDescription>
						{client
							? `This permanently removes ${client.name} ${client.surname} (${client.email}).`
							: ""}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
						{pending ? "Deleting…" : "Delete client"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
