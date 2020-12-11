import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

export function CreatedAt() {
    return CreateDateColumn({ precision: 0, default: () => 'NOW()' })
}

export function UpdatedAt() {
    return UpdateDateColumn({ precision: 0, default: () => 'NOW()' })
}
