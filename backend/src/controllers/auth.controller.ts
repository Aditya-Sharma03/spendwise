import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const generateToken = (user: { id: string; email: string }) => {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction: Create user + default wallets
        const { user, token } = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                },
            });

            // Create default wallets
            await tx.wallet.create({ data: { userId: newUser.id, name: 'Cash', type: 'CASH' } });
            await tx.wallet.create({ data: { userId: newUser.id, name: 'Bank', type: 'BANK' } });

            const token = generateToken(newUser);
            return { user: newUser, token };
        });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (err: any) {
        console.error('Registration Error:', err);
        if (err.code === 'P2002') { // Prisma unique constraint error
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !await bcrypt.compare(password, user.passwordHash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
